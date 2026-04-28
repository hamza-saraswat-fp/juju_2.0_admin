// Top-level owner-routing categories. Mirrored from the bot repo's
// src/config/owner_mapping.json and enforced at the DB layer by CHECK
// constraints on juju_feedback.category and juju_feedback.manual_category_override.
export const CATEGORIES = [
  "accounting_software",
  "core_platform",
  "growth",
  "integrations",
  "ai",
  "operator",
  "general",
] as const;

export type Category = (typeof CATEGORIES)[number];

export type SourceType = "confluence" | "knowledge_center";

export interface Source {
  id: string;
  title: string;
  url: string;
  sourceType: SourceType;
}

export type StarRating = 1 | 2 | 3 | 4 | 5;

export type EscalationType = "user" | "auto";

export type FailureType =
  | "no_sources"
  | "partial_sources"
  | "contradictory"
  | "off_topic";

export interface Rating {
  id: string;
  stars: StarRating;
  raterSlackId: string;
  raterDisplayName: string;
  writtenFeedback: string | null;
  ratedAt: string;
  // True when this rating was reconstructed from a legacy 'helpful'/'not_helpful' vote.
  legacy: boolean;
}

export interface VerifiedAnswer {
  id: string;
  ownerSlackId: string;
  ownerDisplayName: string;
  text: string;
  manualCategoryOverride: Category | null;
  submittedAt: string;
}

export interface Verification {
  id: string;
  verifierSlackId: string;
  verifierDisplayName: string;
  verifiedAt: string;
}

export interface CategoryReroute {
  id: string;
  rerouterSlackId: string;
  rerouterDisplayName: string;
  newCategory: Category;
  reroutedAt: string;
}

export interface Escalation {
  at: string;
  toSlackId: string;
  type: EscalationType;
  triggeredBySlackId: string | null;
  failureType: FailureType | null;
  failureConfidence: number | null;
}

export interface Question {
  id: string;
  askedAt: string;
  asker: { slackId: string; displayName: string };
  questionText: string;
  answerText: string | null;
  answerType: string;
  category: Category | null;
  subCategory: string | null;
  categoryConfidence: number | null;
  answerConfidence: number | null;
  latencyMs: number | null;
  mintlifySources: Source[];
  confluenceSources: Source[];
  searchQueries: unknown | null;
  slackThreadUrl: string;

  ratings: Rating[]; // newest first
  verification: Verification | null; // latest wins
  verifiedAnswer: VerifiedAnswer | null; // latest wins
  categoryReroute: CategoryReroute | null; // latest wins; overrides `category` for effective routing
  escalation: Escalation | null;
}

// Stats computed by useQuestions for the StatCards.
export interface QuestionStats {
  questionsToday: number;
  avgRatingToday: number | null; // null when no ratings today
  ratingCountToday: number;
  escalatedToday: number;
  escalatedTodayAuto: number;
  escalatedTodayUser: number;
  topSubCategory: { label: string; count: number } | null;
  needsAttentionCount: number; // escalated AND no verified answer
}
