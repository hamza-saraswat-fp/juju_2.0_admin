import type {
  PromptSlot,
  EvalCriterion,
  DataSourceConfig,
  FewShotExample,
  ErrorLogEntry,
} from "@/types/botConfig";
import { Category } from "@/types/question";

function daysAgo(days: number): string {
  return new Date(Date.now() - days * 24 * 60 * 60_000).toISOString();
}

function hoursAgo(hours: number): string {
  return new Date(Date.now() - hours * 60 * 60_000).toISOString();
}

const MODELS = ["gpt-4o", "gpt-4o-mini", "claude-3.5-sonnet", "claude-3-haiku"];

// ── Prompt Slots ────────────────────────────────────────────

export const mockPromptSlots: PromptSlot[] = [
  {
    id: "slot-confluence",
    name: "Confluence MCP",
    environment: "production",
    currentPrompt: `# CONFLUENCE KNOWLEDGE RETRIEVAL
Role: Expert documentation assistant.

1. Query internal spaces only.
2. If no result found, state clearly "No internal documentation found for this topic."
3. Prioritize 'Verified' status tags in Confluence metadata.
4. Format output in concise bullet points.
5. Always cite the Confluence page title and space key.
6. Do not fabricate information — only return what is documented.`,
    model: "gpt-4o",
    availableModels: MODELS,
    activeVersionId: "cv-3",
    versions: [
      {
        id: "cv-1",
        version: "v2.2.0",
        label: "Initial",
        prompt: "# CONFLUENCE RETRIEVAL\nQuery internal documentation only.\nReturn bullet points.\nCite sources.",
        model: "gpt-4o-mini",
        createdAt: daysAgo(60),
        description: "Initial confluence retrieval prompt",
      },
      {
        id: "cv-2",
        version: "v2.3.0",
        label: "Improved",
        prompt: "# CONFLUENCE KNOWLEDGE RETRIEVAL\nRole: Documentation assistant.\n1. Query internal spaces.\n2. Cite page title and space key.\n3. Format as bullet points.",
        model: "gpt-4o",
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
        model: "gpt-4o",
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
    model: "claude-3.5-sonnet",
    availableModels: MODELS,
    activeVersionId: "hv-4",
    versions: [
      {
        id: "hv-1",
        version: "v1.7.0",
        label: "Archived",
        prompt: "# HELP CENTER\nAnswer customer questions using help center articles.\nBe polite.",
        model: "gpt-4o-mini",
        createdAt: daysAgo(90),
        description: "Basic help center prompt",
      },
      {
        id: "hv-2",
        version: "v1.8.0",
        label: "Archived",
        prompt: "# CUSTOMER SUPPORT\nContext: Help Center.\n- Empathetic tone.\n- Cite article URLs.\n- Escalate billing to portal.",
        model: "claude-3.5-sonnet",
        createdAt: daysAgo(45),
        description: "Switched to Claude, added escalation rules",
      },
      {
        id: "hv-3",
        version: "v1.8.5",
        label: "Archived",
        prompt: "# CUSTOMER SUPPORT PROTOCOL\nContext: External Customer Help Center.\n- Empathetic tone.\n- Reference public URLs.\n- Escalation for billing.\n- No internal IDs.",
        model: "claude-3.5-sonnet",
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
        model: "claude-3.5-sonnet",
        createdAt: daysAgo(3),
        description: "Added fallback contact recommendation",
      },
    ],
  },
  {
    id: "slot-summary",
    name: "Summary Engine",
    environment: "base",
    currentPrompt: `# SESSION SUMMARIZATION
Objective: Distill chat interaction into structured JSON metadata.

Extract:
1. User Intent (String)
2. Satisfaction Score (0-10)
3. Action Items (Array)
4. Knowledge Gaps (Array)

Output format:
VALID_JSON_ONLY`,
    model: "gpt-4o-mini",
    availableModels: MODELS,
    activeVersionId: "sv-3",
    versions: [
      {
        id: "sv-1",
        version: "v3.0.0",
        label: "Archived",
        prompt: "# SUMMARY\nSummarize the chat.\nOutput JSON with intent, score, action_items.",
        model: "gpt-4o-mini",
        createdAt: daysAgo(40),
        description: "Initial summary engine prompt",
      },
      {
        id: "sv-2",
        version: "v3.0.1",
        label: "Archived",
        prompt: "# SESSION SUMMARIZATION\nExtract: User Intent, Satisfaction Score (0-10), Action Items.\nOutput: VALID_JSON_ONLY",
        model: "gpt-4o-mini",
        createdAt: daysAgo(15),
        description: "Structured extraction with JSON constraint",
      },
      {
        id: "sv-3",
        version: "v3.0.2",
        label: "Production",
        prompt: `# SESSION SUMMARIZATION
Objective: Distill chat interaction into structured JSON metadata.

Extract:
1. User Intent (String)
2. Satisfaction Score (0-10)
3. Action Items (Array)
4. Knowledge Gaps (Array)

Output format:
VALID_JSON_ONLY`,
        model: "gpt-4o-mini",
        createdAt: daysAgo(2),
        description: "Added Knowledge Gaps extraction",
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

// ── Data Sources ────────────────────────────────────────────

export const mockDataSources: DataSourceConfig[] = [
  { id: "ds-1", name: "Confluence MCP", internalId: "internal_wiki_v4", enabled: true },
];

// ── Few-Shot Examples ───────────────────────────────────────

export const mockFewShotExamples: FewShotExample[] = [
  {
    id: "fs-01",
    questionText: "How do I reset my SSO credentials for the internal staging environment?",
    promotedAnswer: "To reset SSO for staging, navigate to Okta > Applications > FieldPulse Staging and click 'Reset Credential' on the top-right toolbar.",
    category: Category.IT_OPS,
    source: "high_confidence",
    createdAt: daysAgo(10),
  },
  {
    id: "fs-02",
    questionText: "What is the escalation path for disputed invoices over $5k?",
    promotedAnswer: "All disputes exceeding $5,000 must be tagged with 'Priority-Billing' and assigned to the Account Receivable Lead for review within 24 hours.",
    category: Category.FINANCE,
    source: "ground_truth",
    createdAt: daysAgo(8),
  },
  {
    id: "fs-03",
    questionText: "What are the P1 response times for enterprise customers?",
    promotedAnswer: "Enterprise P1 issues require a 15-minute response acknowledgement and 2-hour update frequency until resolution.",
    category: Category.OTHER,
    source: "ground_truth",
    createdAt: daysAgo(6),
  },
  {
    id: "fs-04",
    questionText: "How do I add a new team member to the dispatch board?",
    promotedAnswer: "Go to Settings > Team Management > Add User. Assign them the 'Technician' role and enable 'Dispatch Board Visibility' under permissions.",
    category: Category.PRODUCT,
    source: "high_confidence",
    createdAt: daysAgo(12),
  },
  {
    id: "fs-05",
    questionText: "Can customers pay invoices through the customer portal?",
    promotedAnswer: "Yes — customers can view and pay invoices directly through the Customer Portal. Payments are processed via the integrated payment processor (Stripe/Rainforest).",
    category: Category.SALES_PROCESS,
    source: "high_confidence",
    createdAt: daysAgo(15),
  },
  {
    id: "fs-06",
    questionText: "What happens when a recurring job is skipped?",
    promotedAnswer: "If a recurring job occurrence is skipped, it will not generate a job for that period. The next occurrence will be created on the following scheduled date.",
    category: Category.PRODUCT,
    source: "ground_truth",
    createdAt: daysAgo(20),
  },
  {
    id: "fs-07",
    questionText: "How do I enable card fee recovery for a customer?",
    promotedAnswer: "Card Fee Recovery must be enabled at the company level first (Settings > Payments > Card Fee Recovery). Once enabled, it applies to all card transactions automatically.",
    category: Category.FINANCE,
    source: "high_confidence",
    createdAt: daysAgo(5),
  },
  {
    id: "fs-08",
    questionText: "Where can I find the inventory audit log?",
    promotedAnswer: "Go to Reports > Inventory > Inventory Audit Reports. You can filter by hub, date range, and item. The audit log tracks all stock movements.",
    category: Category.PRODUCT,
    source: "high_confidence",
    createdAt: daysAgo(3),
  },
  {
    id: "fs-09",
    questionText: "What permissions are needed to access job costing?",
    promotedAnswer: "Job Costing requires the 'View Job Costing' permission enabled for the user role. Admin and Office Manager roles have this by default. Technicians need it explicitly enabled.",
    category: Category.IT_OPS,
    source: "ground_truth",
    createdAt: daysAgo(7),
  },
  {
    id: "fs-10",
    questionText: "How do I set up automatic invoice reminders?",
    promotedAnswer: "Navigate to Settings > Communications > Automatic Triggers. Create a new trigger for 'Invoice Overdue' and set the delay (e.g., 3 days after due date). You can customize the email template.",
    category: Category.FINANCE,
    source: "high_confidence",
    createdAt: daysAgo(1),
  },
];

// ── Error Log ───────────────────────────────────────────────

export const mockErrorLog: ErrorLogEntry[] = [
  { id: "err-01", timestamp: hoursAgo(0.5), type: "retrieval_error", message: "Confluence API returned 503 — service temporarily unavailable", slotId: "slot-confluence", resolved: false },
  { id: "err-02", timestamp: hoursAgo(1.2), type: "model_timeout", message: "GPT-4o request exceeded 30s timeout for question q-012", slotId: "slot-confluence", resolved: false },
  { id: "err-03", timestamp: hoursAgo(3), type: "parse_error", message: "Summary engine returned invalid JSON — missing closing brace", slotId: "slot-summary", resolved: true },
  { id: "err-04", timestamp: hoursAgo(5), type: "rate_limit", message: "OpenAI rate limit hit: 429 Too Many Requests (RPM exceeded)", slotId: "slot-confluence", resolved: true },
  { id: "err-05", timestamp: hoursAgo(8), type: "retrieval_error", message: "Help Center search returned 0 results for 'asset depreciation schedule'", slotId: "slot-helpcenter", resolved: false },
  { id: "err-06", timestamp: hoursAgo(12), type: "model_timeout", message: "Claude 3.5 Sonnet timeout after 45s on long customer inquiry", slotId: "slot-helpcenter", resolved: true },
  { id: "err-07", timestamp: hoursAgo(18), type: "parse_error", message: "Summary output contained markdown instead of JSON", slotId: "slot-summary", resolved: false },
  { id: "err-08", timestamp: hoursAgo(24), type: "unknown", message: "Unexpected null response from MCP orchestrator", slotId: "slot-confluence", resolved: false },
  { id: "err-09", timestamp: hoursAgo(30), type: "retrieval_error", message: "Confluence page 'VPN Access Guidelines' returned 404 — page may have been moved", slotId: "slot-confluence", resolved: true },
  { id: "err-10", timestamp: hoursAgo(36), type: "rate_limit", message: "Anthropic rate limit: 429 — concurrent request limit reached", slotId: "slot-helpcenter", resolved: false },
  { id: "err-11", timestamp: hoursAgo(48), type: "model_timeout", message: "GPT-4o-mini timeout on batch summary processing", slotId: "slot-summary", resolved: true },
  { id: "err-12", timestamp: hoursAgo(60), type: "retrieval_error", message: "Confluence search query malformed — missing space key parameter", slotId: "slot-confluence", resolved: true },
  { id: "err-13", timestamp: hoursAgo(72), type: "parse_error", message: "Help Center API returned HTML instead of JSON", slotId: "slot-helpcenter", resolved: true },
  { id: "err-14", timestamp: hoursAgo(84), type: "unknown", message: "MCP pipeline hung — no response after 60s", slotId: "slot-confluence", resolved: false },
  { id: "err-15", timestamp: hoursAgo(96), type: "rate_limit", message: "OpenAI token quota exhausted for current billing period", slotId: "slot-summary", resolved: true },
  { id: "err-16", timestamp: hoursAgo(120), type: "retrieval_error", message: "Confluence authentication token expired mid-request", slotId: "slot-confluence", resolved: true },
  { id: "err-17", timestamp: hoursAgo(144), type: "model_timeout", message: "Claude request cancelled after user navigated away", slotId: "slot-helpcenter", resolved: true },
  { id: "err-18", timestamp: hoursAgo(168), type: "parse_error", message: "Summary engine output truncated — max_tokens reached", slotId: "slot-summary", resolved: false },
];
