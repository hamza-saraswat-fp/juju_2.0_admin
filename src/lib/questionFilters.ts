import type { Category, Question } from "@/types/question";
import { effectiveCategory } from "./questionMapper";

export type TimeRange = "24h" | "7d" | "30d" | "all";
export type RatingFilter = "ALL" | "1-2" | "3" | "4-5" | "none";
export type EscalationFilter = "ALL" | "none" | "any" | "auto" | "user";
export type VerifiedFilter = "ALL" | "yes" | "no";

export interface QuestionFilters {
  category: Category | "ALL";
  subCategory: string | "ALL";
  timeRange: TimeRange;
  rating: RatingFilter;
  escalation: EscalationFilter;
  hasVerifiedAnswer: VerifiedFilter;
  onlyNeedsAttention: boolean;
}

export const DEFAULT_FILTERS: QuestionFilters = {
  category: "ALL",
  subCategory: "ALL",
  timeRange: "24h",
  rating: "ALL",
  escalation: "ALL",
  hasVerifiedAnswer: "ALL",
  onlyNeedsAttention: false,
};

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

function avgStars(question: Question): number | null {
  if (question.ratings.length === 0) return null;
  const sum = question.ratings.reduce((s, r) => s + r.stars, 0);
  return sum / question.ratings.length;
}

export function filterQuestions(
  questions: Question[],
  filters: QuestionFilters,
): Question[] {
  const now = Date.now();
  const rangeMs = timeRangeMs(filters.timeRange);

  return questions.filter((q) => {
    if (filters.category !== "ALL") {
      if (effectiveCategory(q) !== filters.category) return false;
    }

    if (filters.subCategory !== "ALL") {
      if (q.subCategory !== filters.subCategory) return false;
    }

    if (rangeMs !== Infinity) {
      if (now - new Date(q.askedAt).getTime() > rangeMs) return false;
    }

    if (filters.rating !== "ALL") {
      const avg = avgStars(q);
      if (filters.rating === "none") {
        if (avg !== null) return false;
      } else {
        if (avg === null) return false;
        if (filters.rating === "1-2" && avg >= 3) return false;
        if (filters.rating === "3" && (avg < 2.5 || avg >= 3.5)) return false;
        if (filters.rating === "4-5" && avg < 4) return false;
      }
    }

    if (filters.escalation !== "ALL") {
      const e = q.escalation;
      if (filters.escalation === "none" && e !== null) return false;
      if (filters.escalation === "any" && e === null) return false;
      if (filters.escalation === "auto" && e?.type !== "auto") return false;
      if (filters.escalation === "user" && e?.type !== "user") return false;
    }

    if (filters.hasVerifiedAnswer !== "ALL") {
      const has = q.verifiedAnswer !== null;
      if (filters.hasVerifiedAnswer === "yes" && !has) return false;
      if (filters.hasVerifiedAnswer === "no" && has) return false;
    }

    if (filters.onlyNeedsAttention) {
      if (q.escalation === null || q.verifiedAnswer !== null) return false;
    }

    return true;
  });
}

/** Case-insensitive substring match against questionText, answerText, and any verified-answer text. */
export function searchQuestions(
  questions: Question[],
  query: string,
): Question[] {
  if (!query.trim()) return questions;
  const lower = query.toLowerCase();
  return questions.filter(
    (q) =>
      q.questionText.toLowerCase().includes(lower) ||
      (q.answerText?.toLowerCase().includes(lower) ?? false) ||
      (q.verifiedAnswer?.text.toLowerCase().includes(lower) ?? false),
  );
}
