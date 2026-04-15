import type {
  Question,
  ConfidenceTier,
  FeedbackState,
  SourceType,
  Category,
} from "@/types/question";
import { confidenceTier, deriveFeedbackState } from "./utils";

// ── Filter types ────────────────────────────────────────────

export type TimeRange = "24h" | "7d" | "30d" | "all";

export interface QuestionFilters {
  category: Category | "ALL";
  confidenceTier: ConfidenceTier | "ALL";
  timeRange: TimeRange;
  feedbackState: FeedbackState | "ALL";
  sourceType: SourceType | "ALL";
  onlyUnanswered: boolean;
}

export const DEFAULT_FILTERS: QuestionFilters = {
  category: "ALL",
  confidenceTier: "ALL",
  timeRange: "24h",
  feedbackState: "ALL",
  sourceType: "ALL",
  onlyUnanswered: false,
};

// ── Pure filter function ────────────────────────────────────

function timeRangeMs(range: TimeRange): number {
  switch (range) {
    case "24h":
      return 24 * 60 * 60_000;
    case "7d":
      return 7 * 24 * 60 * 60_000;
    case "30d":
      return 30 * 24 * 60 * 60_000;
    case "all":
      return Infinity;
  }
}

/**
 * Filter questions by all criteria (AND composition).
 * Pure function — no React dependencies.
 */
export function filterQuestions(
  questions: Question[],
  filters: QuestionFilters,
): Question[] {
  const now = Date.now();
  const rangeMs = timeRangeMs(filters.timeRange);

  return questions.filter((q) => {
    // Category filter (respects override)
    if (filters.category !== "ALL") {
      const effective = q.manualCategoryOverride ?? q.aiCategory;
      if (effective !== filters.category) return false;
    }

    // Confidence tier filter
    if (filters.confidenceTier !== "ALL") {
      if (confidenceTier(q.confidence) !== filters.confidenceTier) return false;
    }

    // Time range filter
    if (rangeMs !== Infinity) {
      if (now - new Date(q.askedAt).getTime() > rangeMs) return false;
    }

    // Feedback state filter
    if (filters.feedbackState !== "ALL") {
      const state = deriveFeedbackState(q.thumbsVotes);
      if (state !== filters.feedbackState) return false;
    }

    // Source type filter
    if (filters.sourceType !== "ALL") {
      if (!q.sources.some((s) => s.sourceType === filters.sourceType))
        return false;
    }

    // Unanswered filter
    if (filters.onlyUnanswered && q.isAnswered) return false;

    return true;
  });
}

// ── Pure search function ────────────────────────────────────

/**
 * Search questions by text — matches against both questionText AND answerText.
 * Case-insensitive substring match.
 * Pure function — no React dependencies.
 */
export function searchQuestions(
  questions: Question[],
  query: string,
): Question[] {
  if (!query.trim()) return questions;

  const lower = query.toLowerCase();
  return questions.filter(
    (q) =>
      q.questionText.toLowerCase().includes(lower) ||
      (q.answerText?.toLowerCase().includes(lower) ?? false),
  );
}
