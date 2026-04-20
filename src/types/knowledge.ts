import type { SourceType, Category } from "./question";

export interface KnowledgeSource {
  id: string;
  title: string;
  url: string;
  sourceType: SourceType;
  owner: string;
  lastModified: string; // ISO timestamp
}

export interface SourceStats {
  source: KnowledgeSource;
  citations: number;
  helpfulRate: number; // 0-100
  staleDays: number;
  staleStatus: "fresh" | "aging" | "stale"; // <90d, 90-180d, >180d
}

export interface CoverageGap {
  id: string;
  category: Category;
  description: string;
  unansweredRate: number; // 0-100
  totalQuestions: number;
  owner: string;
}

export interface UnmatchedQuestion {
  id: string;
  questionText: string;
  hits: number;
  category: Category;
}

export interface HealthAlert {
  id: string;
  type: "warning" | "info";
  label: string;
  description: string;
}

export interface KnowledgeHealthStats {
  totalCitations: number;
  avgHelpfulRate: number; // 0-100
  staleSourceCount: number;
  coverageGapCount: number;
  alerts: HealthAlert[];
}
