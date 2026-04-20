import type {
  PromptSlot,
  EvalCriterion,
  ErrorLogEntry,
} from "@/types/botConfig";

function daysAgo(days: number): string {
  return new Date(Date.now() - days * 24 * 60 * 60_000).toISOString();
}

function hoursAgo(hours: number): string {
  return new Date(Date.now() - hours * 60 * 60_000).toISOString();
}

const MODELS = ["GPT 5.4", "Gemini 3 Pro", "Sonnet 4.6"];

// ── The real synthesis prompt (provided by user) ────────────

const SYNTHESIS_PROMPT = `You are the internal synthesis step for FieldPulse Helper. You have two inputs: an answer drafted from the public help center, and pages retrieved from internal Confluence documentation. Your job is to write a single answer for a FieldPulse team member asking in Slack.

You are NOT merging two answers. You are writing a fresh answer using the help center and Confluence results as source material. Treat them as research notes, not as content to be assembled.

## Step 1: Classify the question

Before writing, silently identify the question type:

- **Factual** ("what is X", "does Y support Z"): 1-3 sentences. Direct answer, one qualifier if needed.
- **Procedural** ("how do I X"): 1-sentence lead + numbered or bulleted steps. No preamble.
- **Diagnostic** ("why is X happening", "X isn't working"): likely cause + what to check. 2-4 sentences or a short list.
- **Capability-with-caveat** ("can I do X"): direct yes/no + the important condition or workaround. 2-4 sentences.

Match your answer shape to the type. Do not use procedural formatting for factual questions.

## Step 2: Identify what the user actually asked

Write the literal question in your head. Your answer must address that question — not the general topic around it.

## Step 3: Separate required context from adjacent context

**Required context** — include this:
- Prerequisites needed to act on the answer
- Common gotchas that will cause the user to fail if not flagged
- Explicit contradictions between HC and internal docs
- Non-obvious caveats that change whether the answer applies

**Adjacent context** — exclude this:
- Other settings within the same feature that don't affect the question
- Related features the user didn't ask about
- Historical notes or background
- "Useful to know" information

## Step 4: Write the answer

- Lead with the most operationally useful piece of information.
- Target 400-800 characters for typical questions. Absolute ceiling 2500.
- Be direct. This is internal.

## Step 5: Handle contradictions

If Confluence contradicts the help center, call it out:
"Help center says X [HC-N]. Internal docs say Y [INT-N] — this usually applies when Z."

## Step 6: Self-critique before sending

Cut any sentence starting with "Additionally," "Also worth noting," "It's worth mentioning". Cut any closer like "Let me know if you need more help." Then ask: can the user take the next action? If yes, send.

## Source tags

Every factual claim must be tagged: [HC-N] for help center, [INT-N] for Confluence. Use at most one tag per claim.

## Slack formatting

- Use *bold* for emphasis (single asterisks, Slack style)
- Use bullets for steps or lists
- Keep paragraphs short — 1-3 sentences
- Do NOT use markdown headers (#), code blocks, or tables`;

// ── Prompt Slots ────────────────────────────────────────────

export const mockPromptSlots: PromptSlot[] = [
  {
    id: "slot-confluence",
    name: "Confluence API",
    environment: "production",
    currentPrompt: `# CONFLUENCE KNOWLEDGE RETRIEVAL
Role: Expert documentation assistant.

1. Query internal spaces only.
2. If no result found, state clearly "No internal documentation found for this topic."
3. Prioritize 'Verified' status tags in Confluence metadata.
4. Format output in concise bullet points.
5. Always cite the Confluence page title and space key.
6. Do not fabricate information — only return what is documented.`,
    model: "GPT 5.4",
    availableModels: MODELS,
    activeVersionId: "cv-3",
    versions: [
      {
        id: "cv-1",
        version: "v2.2.0",
        label: "Archived",
        prompt: "# CONFLUENCE RETRIEVAL\nQuery internal documentation only.\nReturn bullet points.\nCite sources.",
        model: "GPT 5.4",
        createdAt: daysAgo(60),
        description: "Initial confluence retrieval prompt",
      },
      {
        id: "cv-2",
        version: "v2.3.0",
        label: "Archived",
        prompt: "# CONFLUENCE KNOWLEDGE RETRIEVAL\nRole: Documentation assistant.\n1. Query internal spaces.\n2. Cite page title and space key.\n3. Format as bullet points.",
        model: "GPT 5.4",
        createdAt: daysAgo(30),
        description: "Added role definition and citation requirements",
      },
      {
        id: "cv-3",
        version: "v2.4.1",
        label: "Current",
        prompt: `# CONFLUENCE KNOWLEDGE RETRIEVAL
Role: Expert documentation assistant.

1. Query internal spaces only.
2. If no result found, state clearly "No internal documentation found for this topic."
3. Prioritize 'Verified' status tags in Confluence metadata.
4. Format output in concise bullet points.
5. Always cite the Confluence page title and space key.
6. Do not fabricate information — only return what is documented.`,
        model: "GPT 5.4",
        createdAt: daysAgo(5),
        description: "Added verified tag prioritization and no-fabrication rule",
      },
    ],
  },
  {
    id: "slot-helpcenter",
    name: "Help Center MCP",
    environment: "staging",
    currentPrompt: `# CUSTOMER SUPPORT PROTOCOL
Context: External Customer Help Center.

- Maintain empathetic tone.
- Reference public article URLs where applicable.
- Escalation: If query involves billing, provide Link: [Billing Portal].
- Do not disclose internal system IDs.
- If unsure, recommend contacting support@fieldpulse.com.`,
    model: "Sonnet 4.6",
    availableModels: MODELS,
    activeVersionId: "hv-4",
    versions: [
      {
        id: "hv-1",
        version: "v1.7.0",
        label: "Archived",
        prompt: "# HELP CENTER\nAnswer customer questions using help center articles.\nBe polite.",
        model: "GPT 5.4",
        createdAt: daysAgo(90),
        description: "Basic help center prompt",
      },
      {
        id: "hv-2",
        version: "v1.8.0",
        label: "Archived",
        prompt: "# CUSTOMER SUPPORT\nContext: Help Center.\n- Empathetic tone.\n- Cite article URLs.\n- Escalate billing to portal.",
        model: "Sonnet 4.6",
        createdAt: daysAgo(45),
        description: "Switched to Sonnet, added escalation rules",
      },
      {
        id: "hv-3",
        version: "v1.8.5",
        label: "Archived",
        prompt: "# CUSTOMER SUPPORT PROTOCOL\nContext: External Customer Help Center.\n- Empathetic tone.\n- Reference public URLs.\n- Escalation for billing.\n- No internal IDs.",
        model: "Sonnet 4.6",
        createdAt: daysAgo(20),
        description: "Added internal ID restriction",
      },
      {
        id: "hv-4",
        version: "v1.9.0",
        label: "RC-1",
        prompt: `# CUSTOMER SUPPORT PROTOCOL
Context: External Customer Help Center.

- Maintain empathetic tone.
- Reference public article URLs where applicable.
- Escalation: If query involves billing, provide Link: [Billing Portal].
- Do not disclose internal system IDs.
- If unsure, recommend contacting support@fieldpulse.com.`,
        model: "Sonnet 4.6",
        createdAt: daysAgo(3),
        description: "Added fallback contact recommendation",
      },
    ],
  },
  {
    id: "slot-synthesis",
    name: "Synthesis Prompt",
    environment: "production",
    currentPrompt: SYNTHESIS_PROMPT,
    model: "Gemini 3 Pro",
    availableModels: MODELS,
    activeVersionId: "sp-3",
    versions: [
      {
        id: "sp-1",
        version: "v1.0.0",
        label: "Archived",
        prompt: "You are a synthesis assistant. Combine help center and Confluence answers into one clear response for a Slack user. Be concise.",
        model: "GPT 5.4",
        createdAt: daysAgo(40),
        description: "Initial synthesis prompt — basic merge instructions",
      },
      {
        id: "sp-2",
        version: "v1.1.0",
        label: "Archived",
        prompt: "You are the synthesis step for FieldPulse Helper. Write a fresh answer using HC and Confluence as source material. Classify questions first. Use source tags [HC-N] and [INT-N]. Target 400-800 chars.",
        model: "Gemini 3 Pro",
        createdAt: daysAgo(15),
        description: "Added question classification and source tagging",
      },
      {
        id: "sp-3",
        version: "v2.0.0",
        label: "Current",
        prompt: SYNTHESIS_PROMPT,
        model: "Gemini 3 Pro",
        createdAt: daysAgo(2),
        description: "Full rewrite — 6-step process, high-risk topic table, self-critique",
      },
    ],
  },
];

// ── Eval Criteria ───────────────────────────────────────────

export const mockEvalCriteria: EvalCriterion[] = [
  { id: "eval-1", name: "Factual Accuracy", value: 98.2, unit: "percent", isActive: true },
  { id: "eval-2", name: "Response Latency", value: 1.4, unit: "seconds", isActive: true },
  { id: "eval-3", name: "Source Coverage", value: 87, unit: "percent", isActive: true },
];

// ── Error Log ───────────────────────────────────────────────

export const mockErrorLog: ErrorLogEntry[] = [
  { id: "err-01", timestamp: hoursAgo(0.5), type: "retrieval_error", message: "Confluence API returned 503 — service temporarily unavailable", slotId: "slot-confluence", resolved: false },
  { id: "err-02", timestamp: hoursAgo(1.2), type: "model_timeout", message: "GPT 5.4 request exceeded 30s timeout for question q-012", slotId: "slot-confluence", resolved: false },
  { id: "err-03", timestamp: hoursAgo(3), type: "parse_error", message: "Synthesis prompt returned invalid format — missing source tags", slotId: "slot-synthesis", resolved: true },
  { id: "err-04", timestamp: hoursAgo(5), type: "rate_limit", message: "OpenAI rate limit hit: 429 Too Many Requests (RPM exceeded)", slotId: "slot-confluence", resolved: true },
  { id: "err-05", timestamp: hoursAgo(8), type: "retrieval_error", message: "Help Center search returned 0 results for 'asset depreciation schedule'", slotId: "slot-helpcenter", resolved: false },
  { id: "err-06", timestamp: hoursAgo(12), type: "model_timeout", message: "Sonnet 4.6 timeout after 45s on long customer inquiry", slotId: "slot-helpcenter", resolved: true },
  { id: "err-07", timestamp: hoursAgo(18), type: "parse_error", message: "Synthesis output contained markdown headers instead of Slack formatting", slotId: "slot-synthesis", resolved: false },
  { id: "err-08", timestamp: hoursAgo(24), type: "unknown", message: "Unexpected null response from MCP orchestrator", slotId: "slot-confluence", resolved: false },
  { id: "err-09", timestamp: hoursAgo(30), type: "retrieval_error", message: "Confluence page 'VPN Access Guidelines' returned 404 — page may have been moved", slotId: "slot-confluence", resolved: true },
  { id: "err-10", timestamp: hoursAgo(36), type: "rate_limit", message: "Google API rate limit: concurrent request limit reached", slotId: "slot-synthesis", resolved: false },
  { id: "err-11", timestamp: hoursAgo(48), type: "model_timeout", message: "Gemini 3 Pro timeout on batch synthesis processing", slotId: "slot-synthesis", resolved: true },
  { id: "err-12", timestamp: hoursAgo(60), type: "retrieval_error", message: "Confluence search query malformed — missing space key parameter", slotId: "slot-confluence", resolved: true },
  { id: "err-13", timestamp: hoursAgo(72), type: "parse_error", message: "Help Center API returned HTML instead of JSON", slotId: "slot-helpcenter", resolved: true },
  { id: "err-14", timestamp: hoursAgo(84), type: "unknown", message: "MCP pipeline hung — no response after 60s", slotId: "slot-confluence", resolved: false },
  { id: "err-15", timestamp: hoursAgo(96), type: "rate_limit", message: "OpenAI token quota exhausted for current billing period", slotId: "slot-synthesis", resolved: true },
  { id: "err-16", timestamp: hoursAgo(120), type: "retrieval_error", message: "Confluence authentication token expired mid-request", slotId: "slot-confluence", resolved: true },
  { id: "err-17", timestamp: hoursAgo(144), type: "model_timeout", message: "Sonnet request cancelled after user navigated away", slotId: "slot-helpcenter", resolved: true },
  { id: "err-18", timestamp: hoursAgo(168), type: "parse_error", message: "Synthesis output truncated — max_tokens reached", slotId: "slot-synthesis", resolved: false },
];
