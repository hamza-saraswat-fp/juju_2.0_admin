// Category enum — placeholder values, real Lumis list TBD (easy swap)
export enum Category {
  BENEFITS = "BENEFITS",
  IT_OPS = "IT_OPS",
  FINANCE = "FINANCE",
  HR = "HR",
  PRODUCT = "PRODUCT",
  SALES_PROCESS = "SALES_PROCESS",
  OTHER = "OTHER",
}

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
  answerText: string | null; // null = unanswered
  sources: Source[];
  aiCategory: Category; // AI-assigned
  manualCategoryOverride: Category | null; // Admin override
  confidence: number; // 0-100
  latencyMs: number; // Response time in ms
  thumbsVotes: ThumbsVote[];
  slackThreadUrl: string;
  isAnswered: boolean;
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
