// 10 categories, mirrored from the fp-evan/fieldpulse-support-agent autoresponder.
// Also enforced at the DB layer by a CHECK constraint on juju_feedback.category.
export const CATEGORIES = [
  "invoicing",
  "scheduling",
  "payments",
  "mobile-app",
  "integrations",
  "user-management",
  "booking-portal",
  "inventory",
  "reporting",
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

export interface ThumbsVote {
  adminId: string;
  adminName: string;
  vote: "up" | "down";
}

export type FeedbackState = "positive" | "negative" | "mixed" | "none";

// Derived from confidence number: High ≥85, Med 60-84, Low <60
export type ConfidenceTier = "high" | "medium" | "low";

export interface Question {
  id: string;
  askedAt: string; // ISO timestamp
  asker: {
    name: string;
    slackId: string;
  };
  questionText: string;
  threadContext: string | null; // Optional Slack thread context
  answerText: string | null;
  sources: Source[];
  aiCategory: Category; // AI-assigned (from juju_feedback.category)
  manualCategoryOverride: Category | null; // Admin override
  confidence: number; // 0-100 (derived from answer_confidence * 100)
  latencyMs: number;
  thumbsVotes: ThumbsVote[];
  slackThreadUrl: string;
  // True when the parent row has at least one child vote = 'not_helpful'.
  // Surfaces as the "Unanswered" tab / badge in the UI.
  needsReview: boolean;
}

// Derived stats (computed by useQuestions)
export interface QuestionStats {
  questionsToday: number;
  thumbsUpRate: number; // 0-100
  unansweredCount: number;
  topCategory: { category: Category; count: number };
  lowConfidenceCount: number; // confidence < 60
}

export const CURRENT_ADMIN = { id: "admin-1", name: "Hamza" } as const;
