import type {
  Question,
  Source,
  SourceType,
  ThumbsVote,
  Category,
} from "@/types/question";
import { CATEGORIES } from "@/types/question";

// ── Row shapes matching the Supabase SELECT in useQuestions ────────

export interface ChildRow {
  id: string;
  vote: string | null;
  voter_slack_id: string | null;
  voter_display_name: string | null;
  written_feedback: string | null;
  created_at: string | null;
  escalated_to_confluence: boolean | null;
}

export interface ParentRow {
  id: string;
  question: string | null;
  answer_text: string | null;
  category: string | null;
  category_confidence: number | null;
  manual_category_override: string | null;
  answer_confidence: number | null;
  latency_ms: number | null;
  created_at: string;
  message_ts: string | null;
  channel: string | null;
  thread_ts: string | null;
  voter_slack_id: string | null;
  voter_display_name: string | null;
  mintlify_sources: unknown;
  confluence_sources: unknown;
  children?: ChildRow[];
}

// ── Helpers ────────────────────────────────────────────────────────

const CATEGORY_SET = new Set<string>(CATEGORIES);

function toCategory(value: string | null, fallback: Category): Category {
  return value && CATEGORY_SET.has(value) ? (value as Category) : fallback;
}

function toOptionalCategory(value: string | null): Category | null {
  return value && CATEGORY_SET.has(value) ? (value as Category) : null;
}

function normalizeSources(raw: unknown, sourceType: SourceType): Source[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item, idx): Source | null => {
      if (!item || typeof item !== "object") return null;
      const r = item as Record<string, unknown>;
      const url =
        typeof r.url === "string"
          ? r.url
          : typeof r.link === "string"
            ? r.link
            : "";
      const title =
        typeof r.title === "string"
          ? r.title
          : typeof r.name === "string"
            ? r.name
            : url || "Untitled";
      if (!url && !title) return null;
      const id =
        typeof r.id === "string" ? r.id : `${sourceType}-${idx}-${url || title}`;
      return { id, title, url, sourceType };
    })
    .filter((s): s is Source => s !== null);
}

// Strip the "admin:" prefix we use on voter_slack_id for admin-originated votes
// so that session + server votes share the same adminId key (prevents duplicates
// in mergeVotes by adminId in QuestionDetail).
export function normalizeVoterId(raw: string | null | undefined): string {
  if (!raw) return "unknown";
  return raw.startsWith("admin:") ? raw.slice(6) : raw;
}

function childrenToThumbsVotes(children: ChildRow[] | undefined): ThumbsVote[] {
  if (!children) return [];
  return children
    .filter((c) => c.vote === "helpful" || c.vote === "not_helpful")
    .map((c) => ({
      adminId: normalizeVoterId(c.voter_slack_id),
      adminName: c.voter_display_name ?? c.voter_slack_id ?? "Unknown",
      vote: c.vote === "helpful" ? ("up" as const) : ("down" as const),
    }));
}

function deriveSlackThreadUrl(
  channel: string | null,
  threadTs: string | null,
): string {
  if (!channel || !threadTs) return "";
  // Slack archive URL format: threadTs "1234567890.123456" → "p1234567890123456"
  const flat = threadTs.replace(".", "");
  return `https://slack.com/archives/${channel}/p${flat}`;
}

// ── Main mapper ────────────────────────────────────────────────────

export function mapRowToQuestion(row: ParentRow): Question {
  const mintlify = normalizeSources(row.mintlify_sources, "knowledge_center");
  const confluence = normalizeSources(row.confluence_sources, "confluence");

  const children = row.children ?? [];
  const hasNotHelpful = children.some((c) => c.vote === "not_helpful");

  return {
    id: row.id,
    askedAt: row.created_at,
    asker: {
      name: row.voter_display_name ?? "Unknown",
      slackId: row.voter_slack_id ?? "",
    },
    questionText: row.question ?? "",
    threadContext: null,
    answerText: row.answer_text,
    sources: [...mintlify, ...confluence],
    aiCategory: toCategory(row.category, "general"),
    manualCategoryOverride: toOptionalCategory(row.manual_category_override),
    confidence: Math.round((row.answer_confidence ?? 0) * 100),
    latencyMs: row.latency_ms ?? 0,
    thumbsVotes: childrenToThumbsVotes(children),
    slackThreadUrl: deriveSlackThreadUrl(row.channel, row.thread_ts),
    needsReview: hasNotHelpful,
  };
}
