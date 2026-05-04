import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import type {
  DocRequest,
  DocRequestCreatePayload,
  DocRequestEditableFields,
} from "@/types/knowledge";

const SELECT = `
  id, project_name, requestor_name, due_date, asset_types, description,
  helpful_resources, approval_needed, priority_level,
  submitted_by_slack_id, submitted_by_display_name, submitted_at, origin,
  parent_feedback_id, category, thread_permalink, verified_answer, original_question,
  owner, task_status, follow_up_with_requestor, notes, updated_at
`;

interface DocRequestRow {
  id: string;
  project_name: string;
  requestor_name: string | null;
  due_date: string | null;
  asset_types: string[] | null;
  description: string;
  helpful_resources: string | null;
  approval_needed: string | null;
  priority_level: string | null;
  submitted_by_slack_id: string | null;
  submitted_by_display_name: string | null;
  submitted_at: string;
  origin: "slack_flag" | "admin_create";
  parent_feedback_id: string | null;
  category: string | null;
  thread_permalink: string | null;
  verified_answer: string | null;
  original_question: string | null;
  owner: string | null;
  task_status: "waiting" | "in_progress" | "completed" | "rejected";
  follow_up_with_requestor: boolean;
  notes: string | null;
  updated_at: string;
}

function rowToRequest(r: DocRequestRow): DocRequest {
  return {
    id: r.id,
    projectName: r.project_name,
    requestorName: r.requestor_name,
    dueDate: r.due_date,
    assetTypes: r.asset_types ?? [],
    description: r.description,
    helpfulResources: r.helpful_resources,
    approvalNeeded: r.approval_needed,
    priorityLevel: r.priority_level,
    submittedBySlackId: r.submitted_by_slack_id,
    submittedByDisplayName: r.submitted_by_display_name,
    submittedAt: r.submitted_at,
    origin: r.origin,
    parentFeedbackId: r.parent_feedback_id,
    category: r.category,
    threadPermalink: r.thread_permalink,
    verifiedAnswer: r.verified_answer,
    originalQuestion: r.original_question,
    owner: r.owner,
    taskStatus: r.task_status,
    followUpWithRequestor: r.follow_up_with_requestor,
    notes: r.notes,
    updatedAt: r.updated_at,
  };
}

function editableToRow(
  fields: DocRequestEditableFields,
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  if ("owner" in fields) out.owner = fields.owner;
  if ("taskStatus" in fields) out.task_status = fields.taskStatus;
  if ("priorityLevel" in fields) out.priority_level = fields.priorityLevel;
  if ("followUpWithRequestor" in fields)
    out.follow_up_with_requestor = fields.followUpWithRequestor;
  if ("notes" in fields) out.notes = fields.notes;
  if ("dueDate" in fields) out.due_date = fields.dueDate;
  if ("approvalNeeded" in fields) out.approval_needed = fields.approvalNeeded;
  return out;
}

/**
 * Reads + writes juju_doc_requests. Pattern matches useQuestions:
 * direct Supabase calls, useState for cache, refetch on mutation success.
 *
 * Mutations are optimistic in the UI layer (caller patches local state)
 * but this hook always re-fetches on success/failure to converge with
 * server state — avoids stale rows after the bot writes a Slack-flagged
 * request between admin edits.
 */
export function useDocRequests() {
  const [requests, setRequests] = useState<DocRequest[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRequests = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    const { data, error: err } = await supabase
      .from("juju_doc_requests")
      .select(SELECT)
      .order("submitted_at", { ascending: false })
      .limit(500);

    if (err) {
      console.error("[useDocRequests] fetch failed:", err);
      setError(err.message);
      setIsLoading(false);
      return;
    }

    setRequests(((data ?? []) as unknown as DocRequestRow[]).map(rowToRequest));
    setIsLoading(false);
  }, []);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  const updateRequest = useCallback(
    async (id: string, fields: DocRequestEditableFields) => {
      const patch = editableToRow(fields);
      const { error: err } = await supabase
        .from("juju_doc_requests")
        .update(patch)
        .eq("id", id);

      if (err) {
        console.error("[useDocRequests] update failed:", err);
        await fetchRequests();
        throw err;
      }

      // Optimistic local patch — keeps the UI snappy without a full refetch
      // on every keystroke. Background refetch reconciles drift.
      setRequests((prev) =>
        prev.map((r) =>
          r.id === id
            ? {
                ...r,
                ...fields,
                updatedAt: new Date().toISOString(),
              }
            : r,
        ),
      );
    },
    [fetchRequests],
  );

  const createRequest = useCallback(
    async (payload: DocRequestCreatePayload) => {
      const row = {
        project_name: payload.projectName,
        description: payload.description,
        requestor_name: payload.requestorName ?? null,
        due_date: payload.dueDate ?? null,
        asset_types: payload.assetTypes ?? [],
        helpful_resources: payload.helpfulResources ?? null,
        approval_needed: payload.approvalNeeded ?? null,
        priority_level: payload.priorityLevel ?? null,
        owner: payload.owner ?? null,
        notes: payload.notes ?? null,
        category: payload.category ?? null,
        origin: "admin_create" as const,
      };

      const { error: err } = await supabase
        .from("juju_doc_requests")
        .insert(row);

      if (err) {
        console.error("[useDocRequests] create failed:", err);
        throw err;
      }

      await fetchRequests();
    },
    [fetchRequests],
  );

  return {
    requests,
    isLoading,
    error,
    refetch: fetchRequests,
    updateRequest,
    createRequest,
  };
}
