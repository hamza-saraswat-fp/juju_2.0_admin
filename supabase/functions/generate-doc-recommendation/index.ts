// supabase/functions/generate-doc-recommendation/index.ts
//
// Generates AI recommendations on Slack-flagged doc requests.
//
//   POST /functions/v1/generate-doc-recommendation                     ← cron tick (no body)
//   POST /functions/v1/generate-doc-recommendation { id, force: true } ← manual regenerate
//
// On cron ticks: claims up to BATCH_SIZE oldest pending rows via an atomic
// status flip (pending → generating), generates each, writes back. Rows
// that never reach 'generated' or 'failed' (e.g. function timeout) get
// rescued by the next tick — see the requeue logic below.
//
// On manual triggers: single row by id, runs synchronously, returns the new
// recommendation in the response so the UI patches without refetch.
//
// LLM is OpenRouter (matches bot pattern). Model + prompt come from the
// `prompts` table slot 'doc_recommendation_generator' so they hot-swap from
// the Bot Config admin page without redeploy.
//
// Source content fetching: tries Mintlify MCP first; falls back to native
// HTTP scrape. Confluence body is already in juju_feedback.confluence_sources
// at flag time — no extra fetch needed.

import { createClient, SupabaseClient } from "jsr:@supabase/supabase-js@2";

// ─── Types ────────────────────────────────────────────────────────────
interface InvokeBody {
  id?: string;
  force?: boolean;
}

interface DocRequestRow {
  id: string;
  origin: "slack_flag" | "admin_create";
  parent_feedback_id: string | null;
  original_question: string | null;
  verified_answer: string | null;
  recommendation_status: string;
}

interface FeedbackRow {
  id: string;
  question: string | null;
  answer_text: string | null;
  mintlify_sources: Array<{ url: string; title?: string }> | null;
  confluence_sources:
    | Array<{
        url?: string;
        title?: string;
        body?: string;
      }>
    | null;
}

interface CitedSourceSnapshot {
  url: string;
  title: string;
  source_type: "mintlify" | "confluence";
  fetch_status: "ok" | "from_snapshot" | "failed";
  fetch_method?: "mcp" | "http" | "snapshot";
  fetch_error?: string;
  body_chars?: number;
}

interface CitedSourceWithBody extends CitedSourceSnapshot {
  body: string;
}

interface PromptSlot {
  prompt_text: string;
  model: string;
}

interface RecommendationResult {
  classification: "correction" | "gap" | "clarification";
  synopsis: string;
  full_reasoning: string;
}

// ─── Config ───────────────────────────────────────────────────────────
const BATCH_SIZE = 5;            // max rows per cron tick
const SOURCE_CHAR_CAP = 3000;    // per source, fed to LLM
const FETCH_TIMEOUT_MS = 8000;
const LLM_TIMEOUT_MS = 30000;
const REQUEUE_AFTER_MIN = 10;    // a 'generating' row older than this gets retried

// ─── Entry point ──────────────────────────────────────────────────────
Deno.serve(async (req) => {
  try {
    const body: InvokeBody =
      req.method === "POST" ? await req.json().catch(() => ({})) : {};

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false, autoRefreshToken: false } },
    );

    if (body.force && body.id) {
      const result = await generateOne(supabase, body.id, /*force*/ true);
      return json(result, result.status === "failed" ? 500 : 200);
    }

    // Cron tick — claim a batch and process.
    await requeueStaleGenerating(supabase);
    const claimed = await claimPendingBatch(supabase, BATCH_SIZE);
    if (claimed.length === 0) {
      return json({ status: "skipped", message: "no pending rows" });
    }

    const results = await Promise.all(
      claimed.map((id) => generateOne(supabase, id, /*force*/ false)),
    );

    return json({
      status: "ok",
      processed: results.length,
      generated: results.filter((r) => r.status === "generated").length,
      failed: results.filter((r) => r.status === "failed").length,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[gen-doc-rec] unhandled error:", err);
    return json({ status: "failed", error: msg }, 500);
  }
});

// ─── Pending claim + requeue ──────────────────────────────────────────
//
// Atomic claim: SELECT ... FOR UPDATE SKIP LOCKED would be cleaner but
// supabase-js doesn't expose that. We rely on the status enum + the partial
// index to make the claim cheap, and accept that two concurrent invocations
// might race for the same row — the second one's UPDATE just returns 0 rows
// and that id is silently dropped from the second batch.

async function claimPendingBatch(
  supabase: SupabaseClient,
  limit: number,
): Promise<string[]> {
  const { data: candidates, error } = await supabase
    .from("juju_doc_requests")
    .select("id")
    .eq("recommendation_status", "pending")
    .order("submitted_at", { ascending: true })
    .limit(limit);

  if (error) {
    console.error("[gen-doc-rec] claim select failed:", error.message);
    return [];
  }

  const claimed: string[] = [];
  for (const row of candidates ?? []) {
    const { data: updated } = await supabase
      .from("juju_doc_requests")
      .update({ recommendation_status: "generating" })
      .eq("id", row.id)
      .eq("recommendation_status", "pending")
      .select("id")
      .maybeSingle();
    if (updated?.id) claimed.push(updated.id);
  }
  return claimed;
}

// Rows stuck in 'generating' past REQUEUE_AFTER_MIN get flipped back to
// 'pending'. Covers function timeouts, OOM, dropped invocations.
async function requeueStaleGenerating(supabase: SupabaseClient): Promise<void> {
  const cutoff = new Date(Date.now() - REQUEUE_AFTER_MIN * 60_000).toISOString();
  const { error } = await supabase
    .from("juju_doc_requests")
    .update({ recommendation_status: "pending" })
    .eq("recommendation_status", "generating")
    .lt("updated_at", cutoff);
  if (error) {
    console.warn("[gen-doc-rec] requeue stale failed:", error.message);
  }
}

// ─── Core generator ───────────────────────────────────────────────────
interface GenResult {
  id: string;
  status: "generated" | "failed";
  classification?: string;
  synopsis?: string;
  full_reasoning?: string;
  cited_sources?: CitedSourceSnapshot[];
  error?: string;
}

async function generateOne(
  supabase: SupabaseClient,
  id: string,
  force: boolean,
): Promise<GenResult> {
  // For force=true, claim the row even if status isn't 'pending'. Manual
  // regen should work on already-generated, failed, or stale rows.
  if (force) {
    await supabase
      .from("juju_doc_requests")
      .update({ recommendation_status: "generating", recommendation_error: null })
      .eq("id", id);
  }

  // Fetch the doc request + parent juju_feedback row.
  const { data: docReq, error: drErr } = await supabase
    .from("juju_doc_requests")
    .select(
      "id, origin, parent_feedback_id, original_question, verified_answer, recommendation_status",
    )
    .eq("id", id)
    .single<DocRequestRow>();

  if (drErr || !docReq) {
    return await failRow(supabase, id, `doc request not found: ${drErr?.message ?? "no row"}`);
  }

  if (docReq.origin !== "slack_flag") {
    // Defensive: admin_create rows shouldn't be in the queue.
    await supabase
      .from("juju_doc_requests")
      .update({ recommendation_status: "not_applicable" })
      .eq("id", id);
    return { id, status: "failed", error: "skipped: origin != slack_flag" };
  }

  if (!docReq.parent_feedback_id) {
    return await failRow(supabase, id, "no parent_feedback_id on slack_flag row");
  }

  if (!docReq.verified_answer || !docReq.original_question) {
    return await failRow(supabase, id, "missing verified_answer or original_question snapshot");
  }

  const { data: parent, error: pErr } = await supabase
    .from("juju_feedback")
    .select("id, question, answer_text, mintlify_sources, confluence_sources")
    .eq("id", docReq.parent_feedback_id)
    .single<FeedbackRow>();

  if (pErr || !parent) {
    return await failRow(supabase, id, `parent feedback not found: ${pErr?.message ?? "no row"}`);
  }

  // Build cited-source list with body content.
  const sourcesWithBody = await loadCitedSources(parent);
  const sourcesSnapshot: CitedSourceSnapshot[] = sourcesWithBody.map((s) => ({
    url: s.url,
    title: s.title,
    source_type: s.source_type,
    fetch_status: s.fetch_status,
    fetch_method: s.fetch_method,
    fetch_error: s.fetch_error,
    body_chars: s.body.length,
  }));

  // Load the active prompt slot.
  let slot: PromptSlot;
  try {
    slot = await loadPromptSlot(supabase, "doc_recommendation_generator");
  } catch (err) {
    return await failRow(
      supabase,
      id,
      `prompt slot load failed: ${err instanceof Error ? err.message : String(err)}`,
      sourcesSnapshot,
    );
  }

  // Call the LLM.
  let result: RecommendationResult;
  try {
    result = await callLlm(slot, {
      question: docReq.original_question,
      original_juju_answer: parent.answer_text ?? "",
      cited_sources: sourcesWithBody,
      verified_answer: docReq.verified_answer,
    });
  } catch (err) {
    return await failRow(
      supabase,
      id,
      `LLM call failed: ${err instanceof Error ? err.message : String(err)}`,
      sourcesSnapshot,
      slot.model,
    );
  }

  // Validate.
  if (
    !["correction", "gap", "clarification"].includes(result.classification) ||
    !result.synopsis?.trim() ||
    !result.full_reasoning?.trim()
  ) {
    return await failRow(
      supabase,
      id,
      `LLM returned invalid shape: ${JSON.stringify(result).substring(0, 200)}`,
      sourcesSnapshot,
      slot.model,
    );
  }

  // Persist.
  const { error: writeErr } = await supabase
    .from("juju_doc_requests")
    .update({
      recommendation_status: "generated",
      recommendation_classification: result.classification,
      recommendation_synopsis: result.synopsis.trim(),
      recommendation_full: result.full_reasoning.trim(),
      recommendation_cited_sources: sourcesSnapshot,
      recommendation_generated_at: new Date().toISOString(),
      recommendation_model: slot.model,
      recommendation_error: null,
    })
    .eq("id", id);

  if (writeErr) {
    return await failRow(
      supabase,
      id,
      `write-back failed: ${writeErr.message}`,
      sourcesSnapshot,
      slot.model,
    );
  }

  return {
    id,
    status: "generated",
    classification: result.classification,
    synopsis: result.synopsis.trim(),
    full_reasoning: result.full_reasoning.trim(),
    cited_sources: sourcesSnapshot,
  };
}

async function failRow(
  supabase: SupabaseClient,
  id: string,
  error: string,
  sources?: CitedSourceSnapshot[],
  model?: string,
): Promise<GenResult> {
  console.error(`[gen-doc-rec] ${id}: ${error}`);
  await supabase
    .from("juju_doc_requests")
    .update({
      recommendation_status: "failed",
      recommendation_error: error.substring(0, 500),
      recommendation_cited_sources: sources ?? null,
      recommendation_model: model ?? null,
      recommendation_generated_at: new Date().toISOString(),
    })
    .eq("id", id);
  return { id, status: "failed", error };
}

// ─── Source loading ───────────────────────────────────────────────────
//
// Confluence: body is already in juju_feedback.confluence_sources at flag
// time (the bot fetched it during the search step). Use the snapshot.
//
// Mintlify: only {url, title} stored. Try MCP fetch; fall back to native
// HTTP. Cap to SOURCE_CHAR_CAP per source.

async function loadCitedSources(parent: FeedbackRow): Promise<CitedSourceWithBody[]> {
  const out: CitedSourceWithBody[] = [];

  for (const c of parent.confluence_sources ?? []) {
    if (!c.url) continue;
    const body = (c.body ?? "").substring(0, SOURCE_CHAR_CAP);
    out.push({
      url: c.url,
      title: c.title ?? c.url,
      source_type: "confluence",
      fetch_status: body ? "from_snapshot" : "failed",
      fetch_method: "snapshot",
      fetch_error: body ? undefined : "no body in snapshot",
      body,
      body_chars: body.length,
    });
  }

  for (const m of parent.mintlify_sources ?? []) {
    if (!m.url) continue;
    const fetched = await fetchMintlifyContent(m.url);
    out.push({
      url: m.url,
      title: m.title ?? m.url,
      source_type: "mintlify",
      ...fetched,
      body_chars: fetched.body.length,
    });
  }

  return out;
}

async function fetchMintlifyContent(url: string): Promise<{
  body: string;
  fetch_status: "ok" | "failed";
  fetch_method: "http";
  fetch_error?: string;
}> {
  // v1: native HTTP. Mintlify pages are server-rendered HTML; we extract
  // visible text by stripping tags. MCP integration deferred — the static
  // HTML path is reliable enough for v1 and the Mintlify MCP tools are
  // designed for LLM tool-calling rather than direct URL→content lookup.
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { "User-Agent": "FieldPulse-Juju-DocRec/1.0" },
    });
    if (!res.ok) {
      return {
        body: "",
        fetch_status: "failed",
        fetch_method: "http",
        fetch_error: `HTTP ${res.status}`,
      };
    }
    const html = await res.text();
    const text = stripHtmlToText(html).substring(0, SOURCE_CHAR_CAP);
    return text
      ? { body: text, fetch_status: "ok", fetch_method: "http" }
      : { body: "", fetch_status: "failed", fetch_method: "http", fetch_error: "no extractable text" };
  } catch (err) {
    return {
      body: "",
      fetch_status: "failed",
      fetch_method: "http",
      fetch_error: err instanceof Error ? err.message : String(err),
    };
  } finally {
    clearTimeout(t);
  }
}

function stripHtmlToText(html: string): string {
  // Cheap text extraction: drop <script>/<style>, strip remaining tags,
  // collapse whitespace, decode the most common entities. Good enough for
  // an LLM grounding signal — we're not trying to preserve formatting.
  const noScript = html.replace(/<script[\s\S]*?<\/script>/gi, " ");
  const noStyle = noScript.replace(/<style[\s\S]*?<\/style>/gi, " ");
  const noTags = noStyle.replace(/<[^>]+>/g, " ");
  const decoded = noTags
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
  return decoded.replace(/\s+/g, " ").trim();
}

// ─── Prompt slot ──────────────────────────────────────────────────────
async function loadPromptSlot(
  supabase: SupabaseClient,
  slotId: string,
): Promise<PromptSlot> {
  const { data, error } = await supabase
    .from("prompts")
    .select("prompt_text, model")
    .eq("slot_id", slotId)
    .eq("is_active", true)
    .limit(1)
    .maybeSingle<PromptSlot>();
  if (error || !data) {
    throw new Error(`no active prompt for slot '${slotId}': ${error?.message ?? "not found"}`);
  }
  return data;
}

// ─── LLM call (OpenRouter) ────────────────────────────────────────────
async function callLlm(
  slot: PromptSlot,
  input: {
    question: string;
    original_juju_answer: string;
    cited_sources: CitedSourceWithBody[];
    verified_answer: string;
  },
): Promise<RecommendationResult> {
  const apiKey = Deno.env.get("OPENROUTER_API_KEY");
  if (!apiKey) throw new Error("OPENROUTER_API_KEY env var not set");

  const userPayload = {
    question: input.question,
    original_juju_answer: input.original_juju_answer,
    cited_sources: input.cited_sources.map((s) => ({
      url: s.url,
      title: s.title,
      source_type: s.source_type,
      fetch_status: s.fetch_status,
      body: s.body,
    })),
    verified_answer: input.verified_answer,
  };

  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), LLM_TIMEOUT_MS);
  try {
    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: slot.model,
        max_tokens: 1024,
        messages: [
          { role: "system", content: slot.prompt_text },
          { role: "user", content: JSON.stringify(userPayload) },
        ],
      }),
    });
    if (!res.ok) {
      const errBody = await res.text().catch(() => "");
      throw new Error(`OpenRouter HTTP ${res.status}: ${errBody.substring(0, 200)}`);
    }
    const body = await res.json();
    const text: string = body?.choices?.[0]?.message?.content ?? "";
    if (!text) throw new Error("empty LLM response");

    const match = text.match(/\{[\s\S]*\}/);
    if (!match) throw new Error(`no JSON object in response: ${text.substring(0, 200)}`);
    const parsed = JSON.parse(match[0]);
    return parsed as RecommendationResult;
  } finally {
    clearTimeout(t);
  }
}

// ─── HTTP helper ──────────────────────────────────────────────────────
function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
}
