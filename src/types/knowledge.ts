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

export type DocRequestStatus =
  | "waiting"
  | "in_progress"
  | "completed"
  | "rejected";

export type DocRequestOrigin = "slack_flag" | "admin_create";

export interface DocRequest {
  id: string;
  projectName: string;
  requestorName: string | null;
  dueDate: string | null; // ISO date (YYYY-MM-DD)
  assetTypes: string[];
  description: string;
  helpfulResources: string | null;
  approvalNeeded: string | null;
  priorityLevel: string | null;

  submittedBySlackId: string | null;
  submittedByDisplayName: string | null;
  submittedAt: string; // ISO timestamp
  origin: DocRequestOrigin;

  parentFeedbackId: string | null;
  category: string | null;
  threadPermalink: string | null;
  verifiedAnswer: string | null;
  originalQuestion: string | null;

  owner: string | null;
  taskStatus: DocRequestStatus;
  followUpWithRequestor: boolean;
  notes: string | null;

  updatedAt: string; // ISO timestamp
}

// Editable subset — what inline-edit + the create form can touch.
export type DocRequestEditableFields = Partial<
  Pick<
    DocRequest,
    | "owner"
    | "taskStatus"
    | "priorityLevel"
    | "followUpWithRequestor"
    | "notes"
    | "dueDate"
    | "approvalNeeded"
  >
>;

// Required fields when admin creates a standalone request.
export type DocRequestCreatePayload = Pick<
  DocRequest,
  "projectName" | "description"
> &
  Partial<
    Pick<
      DocRequest,
      | "requestorName"
      | "dueDate"
      | "assetTypes"
      | "helpfulResources"
      | "approvalNeeded"
      | "priorityLevel"
      | "owner"
      | "notes"
      | "category"
    >
  >;
