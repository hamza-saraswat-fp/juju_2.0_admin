import type {
  CategoryReroute,
  Category,
  EscalationType,
  Escalation,
  FailureType,
  Question,
  Rating,
  Source,
  SourceType,
  StarRating,
  VerifiedAnswer,
  Verification,
} from "@/types/question";
import { CATEGORIES } from "@/types/question";
import { ownerName } from "@/config/jujuTaxonomy";

// ── Row shapes mirroring the live juju_feedback schema ────────────

export interface ChildRow {
  id: string;
  vote: string | null;
  star_rating: number | null;
  voter_slack_id: string | null;
  voter_display_name: string | null;
  written_feedback: string | null;
  manual_category_override: string | null;
  message_ts: string | null;
  created_at: string | null;
}

export interface ParentRow {
  id: string;
  question: string | null;
  answer_text: string | null;
  answer_type: string | null;
  category: string | null;
  sub_category: string | null;
  category_confidence: number | null;
  manual_category_override: string | null;
  answer_confidence: number | null;
  latency_ms: number | null;
  created_at: string;
  message_ts: string | null;
  channel: string | null;
  thread_ts: string | null;
  asker_slack_id: string | null;
  mintlify_sources: unknown;
  confluence_sources: unknown;
  search_queries: unknown;
  escalated_at: string | null;
  escalated_to: string | null;
  escalation_type: string | null;
  escalation_triggered_by: string | null;
  failure_type: string | null;
  failure_confidence: number | null;
  children?: ChildRow[];
}

// ── Helpers ────────────────────────────────────────────────────────

const CATEGORY_SET = new Set<string>(CATEGORIES);
const FAILURE_SET = new Set<FailureType>([
  "no_sources",
  "partial_sources",
  "contradictory",
  "off_topic",
]);

function toCategory(value: string | null): Category | null {
  return value && CATEGORY_SET.has(value) ? (value as Category) : null;
}

function toEscalationType(value: string | null): EscalationType | null {
  return value === "user" || value === "auto" ? value : null;
}

function toFailureType(value: string | null): FailureType | null {
  return value && FAILURE_SET.has(value as FailureType)
    ? (value as FailureType)
    : null;
}

function toStarRating(value: number | null): StarRating | null {
  if (value === null || value === undefined) return null;
  const rounded = Math.round(value);
  if (rounded < 1 || rounded > 5) return null;
  return rounded as StarRating;
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
        typeof r.id === "string"
          ? r.id
          : `${sourceType}-${idx}-${url || title}`;
      return { id, title, url, sourceType };
    })
    .filter((s): s is Source => s !== null);
}

function deriveSlackThreadUrl(
  channel: string | null,
  threadTs: string | null,
): string {
  if (!channel || !threadTs) return "";
  const flat = threadTs.replace(".", "");
  return `https://slack.com/archives/${channel}/p${flat}`;
}

function pickLatest<T extends { ratedAt?: string; submittedAt?: string; verifiedAt?: string; reroutedAt?: string }>(
  items: T[],
  key: keyof T,
): T | null {
  if (items.length === 0) return null;
  return items.reduce((best, cur) => {
    const bestVal = best[key] as unknown as string;
    const curVal = cur[key] as unknown as string;
    return curVal > bestVal ? cur : best;
  });
}

// ── Children partitioning ──────────────────────────────────────────

interface PartitionedChildren {
  ratings: Rating[];
  verification: Verification | null;
  verifiedAnswer: VerifiedAnswer | null;
  categoryReroute: CategoryReroute | null;
}

function partitionChildren(children: ChildRow[]): PartitionedChildren {
  const ratings: Rating[] = [];
  const verifications: Verification[] = [];
  const verifiedAnswers: VerifiedAnswer[] = [];
  const reroutes: CategoryReroute[] = [];

  for (const c of children) {
    const ratedAt = c.created_at ?? "";
    const stars = toStarRating(c.star_rating);

    // 1. Rating child (new path).
    if (stars !== null) {
      ratings.push({
        id: c.id,
        stars,
        raterSlackId: c.voter_slack_id ?? "",
        raterDisplayName:
          c.voter_display_name ?? ownerName(c.voter_slack_id) ?? "Unknown",
        writtenFeedback: c.written_feedback,
        ratedAt,
        legacy: false,
      });
      continue;
    }

    // 2. Legacy thumbs (helpful/not_helpful) — synthesize a rating for display.
    if (c.vote === "helpful" || c.vote === "not_helpful") {
      ratings.push({
        id: c.id,
        stars: c.vote === "helpful" ? 5 : 1,
        raterSlackId: c.voter_slack_id ?? "",
        raterDisplayName:
          c.voter_display_name ?? ownerName(c.voter_slack_id) ?? "Unknown",
        writtenFeedback: c.written_feedback,
        ratedAt,
        legacy: true,
      });
      continue;
    }

    // 3. Workflow children.
    if (c.vote === "verified") {
      // Mark Accurate vs. category-only reroute is keyed on message_ts.
      if (c.message_ts) {
        verifications.push({
          id: c.id,
          verifierSlackId: c.voter_slack_id ?? "",
          verifierDisplayName:
            c.voter_display_name ?? ownerName(c.voter_slack_id) ?? "Unknown",
          verifiedAt: ratedAt,
        });
      } else {
        const newCategory = toCategory(c.manual_category_override);
        if (newCategory) {
          reroutes.push({
            id: c.id,
            rerouterSlackId: c.voter_slack_id ?? "",
            rerouterDisplayName:
              c.voter_display_name ?? ownerName(c.voter_slack_id) ?? "Unknown",
            newCategory,
            reroutedAt: ratedAt,
          });
        }
      }
      continue;
    }

    if (c.vote === "answered") {
      verifiedAnswers.push({
        id: c.id,
        ownerSlackId: c.voter_slack_id ?? "",
        ownerDisplayName:
          c.voter_display_name ?? ownerName(c.voter_slack_id) ?? "Unknown",
        text: c.written_feedback ?? "",
        manualCategoryOverride: toCategory(c.manual_category_override),
        submittedAt: ratedAt,
      });
      continue;
    }

    // 'clarification' vote and any unknown values are intentionally ignored.
  }

  ratings.sort((a, b) => (a.ratedAt < b.ratedAt ? 1 : -1));

  return {
    ratings,
    verification: pickLatest(verifications, "verifiedAt"),
    verifiedAnswer: pickLatest(verifiedAnswers, "submittedAt"),
    categoryReroute: pickLatest(reroutes, "reroutedAt"),
  };
}

// ── Main mapper ────────────────────────────────────────────────────

export function mapRowToQuestion(row: ParentRow): Question {
  const mintlify = normalizeSources(row.mintlify_sources, "knowledge_center");
  const confluence = normalizeSources(row.confluence_sources, "confluence");
  const partitioned = partitionChildren(row.children ?? []);

  const escalation: Escalation | null =
    row.escalated_at && row.escalated_to
      ? {
          at: row.escalated_at,
          toSlackId: row.escalated_to,
          type: toEscalationType(row.escalation_type) ?? "user",
          triggeredBySlackId: row.escalation_triggered_by,
          failureType: toFailureType(row.failure_type),
          failureConfidence: row.failure_confidence,
        }
      : null;

  return {
    id: row.id,
    askedAt: row.created_at,
    asker: {
      slackId: row.asker_slack_id ?? "",
      displayName: ownerName(row.asker_slack_id),
    },
    questionText: row.question ?? "",
    answerText: row.answer_text,
    answerType: row.answer_type ?? "synthesized",
    category: toCategory(row.category),
    subCategory: row.sub_category,
    categoryConfidence: row.category_confidence,
    answerConfidence: row.answer_confidence,
    latencyMs: row.latency_ms,
    mintlifySources: mintlify,
    confluenceSources: confluence,
    searchQueries: row.search_queries,
    slackThreadUrl: deriveSlackThreadUrl(row.channel, row.thread_ts),
    ratings: partitioned.ratings,
    verification: partitioned.verification,
    verifiedAnswer: partitioned.verifiedAnswer,
    categoryReroute: partitioned.categoryReroute,
    escalation,
  };
}

// Effective category honors the latest reroute child if present; otherwise the
// classifier value. Used for both the table cell and the sub-category filter.
export function effectiveCategory(question: Question): Category | null {
  return question.categoryReroute?.newCategory ?? question.category;
}
