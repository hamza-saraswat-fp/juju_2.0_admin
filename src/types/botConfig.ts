import type { Category } from "./question";

export interface PromptVersion {
  id: string;
  version: string;
  label: string;
  prompt: string;
  model: string;
  createdAt: string;
  description: string;
}

export interface PromptSlot {
  id: string;
  name: string;
  environment: "production" | "staging" | "base";
  currentPrompt: string;
  model: string;
  availableModels: string[];
  versions: PromptVersion[];
  activeVersionId: string;
}

export interface EvalCriterion {
  id: string;
  name: string;
  value: number;
  unit: "percent" | "seconds";
  isActive: boolean;
}

export interface DataSourceConfig {
  id: string;
  name: string;
  internalId: string;
  enabled: boolean;
}

export interface FewShotExample {
  id: string;
  questionText: string;
  promotedAnswer: string;
  category: Category;
  source: "high_confidence" | "ground_truth";
  createdAt: string;
}

export type ErrorType =
  | "retrieval_error"
  | "model_timeout"
  | "parse_error"
  | "rate_limit"
  | "unknown";

export interface ErrorLogEntry {
  id: string;
  timestamp: string;
  type: ErrorType;
  message: string;
  slotId: string;
  resolved: boolean;
}
