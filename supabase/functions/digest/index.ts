// supabase/functions/digest/index.ts
//
// Single edge function that handles both daily and weekly Slack digests, for
// both scheduled (hourly cron tick) and manual ("Send now" from the admin
// UI) invocations.
//
//   POST /functions/v1/digest                         ← cron tick, no body
//   POST /functions/v1/digest  { kind, force: true }  ← manual trigger
//
// On cron ticks the function reads app_config and decides whether the
// current Chicago wall-clock hour matches a scheduled run. If it does, it
// composes and posts; otherwise it bumps app_config.last_tick_at and
// returns "skipped" without writing to digest_log.
//
// On manual triggers the schedule check is skipped — explicit user intent.
//
// Replaces the prior Vercel-Cron + Vercel-API setup. See plan in
// /Users/hamzasaraswat/.claude/plans/look-at-the-logs-swift-sparrow.md.

import { createClient, SupabaseClient } from "jsr:@supabase/supabase-js@2";

// ─── Types ────────────────────────────────────────────────────────────
type Kind = "daily" | "weekly";
type TriggeredBy = "cron" | "manual";

interface InvokeBody {
  kind?: Kind;
  force?: boolean;
}

interface AppConfig {
  daily_digest_enabled: boolean;
  weekly_digest_enabled: boolean;
  digest_channel_id: string | null;
  daily_digest_template: string | null;
  weekly_digest_template: string | null;
  daily_send_hour_chicago: number;
  daily_send_weekdays_only: boolean;
  weekly_send_hour_chicago: number;
  weekly_send_dow: number;
}

interface SlackBlock {
  type: string;
  [key: string]: unknown;
}

interface DigestPayload {
  text: string;
  blocks: SlackBlock[];
}

// ─── Defaults (kept in sync with src/lib/digestPayload.ts) ────────────
const DEFAULT_DAILY_TEMPLATE =
  "🤖 *Juju yesterday*\n\n" +
  "📊 *{total}* questions answered  ·  ⚡ *{auto_resolve_pct}* solved without needing a human\n" +
  "👥 *{unique_users}* people helped from across the company\n" +
  "🏆 Most-asked topic: *{top_category}*\n\n" +
  "_Tap @juju in any channel to ask a question →_";

const DEFAULT_WEEKLY_TEMPLATE =
  "🚀 *Juju this week*\n\n" +
  "📊 *{total}* questions answered{trend}\n" +
  "⚡ *{auto_resolve_pct}* solved automatically  ·  👥 *{unique_users}* unique askers\n" +
  "🏆 Top 3 topics: {top_3}\n" +
  "🌟 Most active day: *{peak_day}* ({peak_day_count} questions)\n\n" +
  "_Tap @juju in any channel to ask a question →_";

const CATEGORY_LABELS: Record<string, string> = {
  accounting_software: "Accounting Software",
  core_platform: "Core Platform",
  growth: "Growth",
  integrations: "Integrations",
  ai: "AI",
  operator: "Operator",
  general: "General",
};

// ─── Entry point ──────────────────────────────────────────────────────
Deno.serve(async (req) => {
  try {
    const body: InvokeBody =
      req.method === "POST"
        ? await req.json().catch(() => ({}))
        : {};

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false, autoRefreshToken: false } },
    );

    const result = await runDigest(supabase, body);
    return json(result, result.status === "failed" ? 500 : 200);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[digest] unhandled error:", err);
    return json(
      { status: "failed", message: `unhandled error: ${msg}`, error: msg },
      500,
    );
  }
});

// ─── Core flow ────────────────────────────────────────────────────────
interface RunResult {
  status: "sent" | "skipped" | "failed";
  message: string;
  channel?: string;
  ts?: string;
  error?: string;
}

async function runDigest(
  supabase: SupabaseClient,
  body: InvokeBody,
): Promise<RunResult> {
  // Read config once.
  const { data: cfg, error: cfgErr } = await supabase
    .from("app_config")
    .select(
      "daily_digest_enabled, weekly_digest_enabled, digest_channel_id, " +
        "daily_digest_template, weekly_digest_template, " +
        "daily_send_hour_chicago, daily_send_weekdays_only, " +
        "weekly_send_hour_chicago, weekly_send_dow",
    )
    .eq("id", 1)
    .single<AppConfig>();
  if (cfgErr || !cfg) {
    const msg = `app_config read failed: ${cfgErr?.message ?? "no row"}`;
    return { status: "failed", message: msg, error: msg };
  }

  const triggeredBy: TriggeredBy = body.force ? "manual" : "cron";

  // Decide what (if anything) fires this invocation.
  const kind = body.force
    ? (body.kind ?? "daily")
    : pickScheduledKind(cfg);

  if (!kind) {
    // Skipped tick — bump liveness without flooding digest_log.
    await supabase
      .from("app_config")
      .update({ last_tick_at: new Date().toISOString() })
      .eq("id", 1);
    return { status: "skipped", message: "not scheduled this hour" };
  }

  const channel = cfg.digest_channel_id;
  if (!channel) {
    return await logAndReturn(supabase, kind, triggeredBy, "", "skipped", {
      message: "no channel configured",
    });
  }

  // Compose
  const template =
    kind === "daily"
      ? (cfg.daily_digest_template ?? DEFAULT_DAILY_TEMPLATE)
      : (cfg.weekly_digest_template ?? DEFAULT_WEEKLY_TEMPLATE);

  let payload: DigestPayload;
  try {
    payload =
      kind === "daily"
        ? await composeDailyDigest(supabase, template)
        : await composeWeeklyDigest(supabase, template);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return await logAndReturn(supabase, kind, triggeredBy, channel, "failed", {
      message: `compose failed: ${msg}`,
      error: msg,
    });
  }

  // Post
  try {
    const { ts } = await postSlackMessage({
      channel,
      text: payload.text,
      blocks: payload.blocks,
    });
    return await logAndReturn(supabase, kind, triggeredBy, channel, "sent", {
      message: "posted",
      ts,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return await logAndReturn(supabase, kind, triggeredBy, channel, "failed", {
      message: `slack post failed: ${msg}`,
      error: msg,
    });
  }
}

// ─── Schedule decision ────────────────────────────────────────────────
function pickScheduledKind(cfg: AppConfig): Kind | null {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Chicago",
    hour: "numeric",
    hour12: false,
    weekday: "short",
  });
  const parts = fmt.formatToParts(new Date());
  const hourPart = parts.find((p) => p.type === "hour")!.value;
  // Intl can render "24" for midnight in some locales; coerce to 0.
  const hour = parseInt(hourPart, 10) % 24;
  const weekday = parts.find((p) => p.type === "weekday")!.value;
  const dowMap: Record<string, number> = {
    Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6,
  };
  const dow = dowMap[weekday] ?? 0;
  const isWeekday = dow >= 1 && dow <= 5;

  // Weekly wins if both land on the same hour (avoids double-posting).
  if (
    cfg.weekly_digest_enabled &&
    hour === cfg.weekly_send_hour_chicago &&
    dow === cfg.weekly_send_dow
  ) {
    return "weekly";
  }
  if (
    cfg.daily_digest_enabled &&
    hour === cfg.daily_send_hour_chicago &&
    (!cfg.daily_send_weekdays_only || isWeekday)
  ) {
    return "daily";
  }
  return null;
}

// ─── Variable fetchers (RPC-backed) ───────────────────────────────────
async function fetchDailyVars(
  supabase: SupabaseClient,
): Promise<Record<string, string>> {
  const [hero, phase2] = await Promise.all([
    supabase.rpc("get_question_log_metrics", { p_time_range: "24h" }),
    supabase.rpc("get_question_log_phase2", {
      p_time_range: "24h",
      p_category: "ALL",
      p_escalation: "ALL",
      p_verified: "ALL",
    }),
  ]);
  if (hero.error) throw new Error(`hero RPC failed: ${hero.error.message}`);
  if (phase2.error) throw new Error(`phase2 RPC failed: ${phase2.error.message}`);

  const total = Math.round(hero.data?.avg_messages_window ?? 0);
  const autoResolvePct = formatPct(hero.data?.auto_resolve_window ?? null);
  const uniqueUsers = hero.data?.unique_users_window ?? 0;
  const topCat = phase2.data?.top_categories?.[0];

  return {
    total: String(total),
    auto_resolve_pct: autoResolvePct,
    unique_users: String(uniqueUsers),
    top_category: categoryLabel(topCat?.category),
  };
}

async function fetchWeeklyVars(
  supabase: SupabaseClient,
): Promise<Record<string, string>> {
  const [hero, phase2, phase3] = await Promise.all([
    supabase.rpc("get_question_log_metrics", { p_time_range: "7d" }),
    supabase.rpc("get_question_log_phase2", {
      p_time_range: "7d",
      p_category: "ALL",
      p_escalation: "ALL",
      p_verified: "ALL",
    }),
    supabase.rpc("get_question_log_phase3", {
      p_time_range: "7d",
      p_category: "ALL",
      p_escalation: "ALL",
      p_verified: "ALL",
    }),
  ]);
  if (hero.error) throw new Error(`hero RPC failed: ${hero.error.message}`);
  if (phase2.error) throw new Error(`phase2 RPC failed: ${phase2.error.message}`);
  if (phase3.error) throw new Error(`phase3 RPC failed: ${phase3.error.message}`);

  const avgPerDay: number = hero.data?.avg_messages_window ?? 0;
  const priorAvg: number | null = hero.data?.avg_messages_prior ?? null;
  const totalThisWeek = Math.round(avgPerDay * 7);
  const autoResolvePct = formatPct(hero.data?.auto_resolve_window ?? null);
  const uniqueUsers = hero.data?.unique_users_window ?? 0;

  const top3 =
    (phase2.data?.top_categories ?? [])
      .slice(0, 3)
      .map((c: { category: string }) => categoryLabel(c.category))
      .join(" · ") || "—";

  // Heatmap: 168 cells (dow * 24 + hour), Mon=0..Sun=6.
  const heatmap: number[] = phase3.data?.heatmap ?? [];
  let peakDow = 0;
  let peakDowCount = 0;
  if (heatmap.length === 168) {
    for (let d = 0; d < 7; d++) {
      let dayTotal = 0;
      for (let h = 0; h < 24; h++) dayTotal += heatmap[d * 24 + h] ?? 0;
      if (dayTotal > peakDowCount) {
        peakDowCount = dayTotal;
        peakDow = d;
      }
    }
  }

  const dayNames = [
    "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday",
  ];

  return {
    total: String(totalThisWeek),
    auto_resolve_pct: autoResolvePct,
    unique_users: String(uniqueUsers),
    trend: trendString(avgPerDay, priorAvg),
    top_3: top3,
    peak_day: dayNames[peakDow] ?? "—",
    peak_day_count: String(peakDowCount),
  };
}

// ─── Composers ────────────────────────────────────────────────────────
async function composeDailyDigest(
  supabase: SupabaseClient,
  template: string,
): Promise<DigestPayload> {
  return renderToBlocks(template, await fetchDailyVars(supabase));
}

async function composeWeeklyDigest(
  supabase: SupabaseClient,
  template: string,
): Promise<DigestPayload> {
  return renderToBlocks(template, await fetchWeeklyVars(supabase));
}

function renderToBlocks(
  template: string,
  vars: Record<string, string>,
): DigestPayload {
  const rendered = renderTemplate(template, vars);
  return {
    text: plainTextFallback(rendered),
    blocks: [{ type: "section", text: { type: "mrkdwn", text: rendered } }],
  };
}

// ─── Slack ────────────────────────────────────────────────────────────
async function postSlackMessage(opts: {
  channel: string;
  text: string;
  blocks: SlackBlock[];
}): Promise<{ ts: string }> {
  const token = Deno.env.get("SLACK_BOT_TOKEN");
  if (!token) throw new Error("SLACK_BOT_TOKEN env var not set");

  const res = await fetch("https://slack.com/api/chat.postMessage", {
    method: "POST",
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      channel: opts.channel,
      text: opts.text,
      blocks: opts.blocks,
      unfurl_links: false,
      unfurl_media: false,
    }),
  });
  if (!res.ok) {
    throw new Error(`Slack HTTP ${res.status} ${res.statusText}`);
  }
  const body = (await res.json()) as { ok: boolean; error?: string; ts?: string };
  if (!body.ok) throw new Error(`Slack API error: ${body.error ?? "unknown"}`);
  return { ts: body.ts ?? "" };
}

// ─── Helpers ──────────────────────────────────────────────────────────
function categoryLabel(raw: string | null | undefined): string {
  if (!raw) return "Various";
  return CATEGORY_LABELS[raw] ?? raw;
}

function formatPct(n: number | null | undefined): string {
  if (n === null || n === undefined) return "—";
  return `${Math.round(n * 100)}%`;
}

function trendString(current: number, prior: number | null): string {
  if (prior === null || prior === 0) return "";
  const pct = ((current - prior) / prior) * 100;
  const sign = pct >= 0 ? "+" : "";
  return ` (*${sign}${pct.toFixed(0)}%* vs last week)`;
}

function renderTemplate(
  template: string,
  vars: Record<string, string>,
): string {
  return template.replace(/\{(\w+)\}/g, (_m, key) =>
    Object.prototype.hasOwnProperty.call(vars, key) ? vars[key] : `{${key}}`,
  );
}

function plainTextFallback(rendered: string): string {
  return rendered
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/_([^_]+)_/g, "$1")
    .replace(/\n+/g, " · ")
    .trim();
}

async function logAndReturn(
  supabase: SupabaseClient,
  kind: Kind,
  triggeredBy: TriggeredBy,
  channel: string,
  status: RunResult["status"],
  extra: { message: string; ts?: string; error?: string },
): Promise<RunResult> {
  await supabase.from("digest_log").insert({
    kind,
    triggered_by: triggeredBy,
    channel_id: channel,
    status,
    error: extra.error ?? null,
  });
  return {
    status,
    message: extra.message,
    channel,
    ts: extra.ts,
    error: extra.error,
  };
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
}
