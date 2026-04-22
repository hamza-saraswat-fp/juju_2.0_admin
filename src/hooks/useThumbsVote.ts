import { useCallback, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { Question, ThumbsVote } from "@/types/question";

interface UseThumbsVoteOptions {
  onMutate?: () => void; // refetch callback from useQuestions
}

/**
 * Admin thumbs voting.
 *
 * Writes a child row to juju_feedback with parent_feedback_id set to the
 * question's id. The admin identity is stored in voter_slack_id prefixed
 * with "admin:" so it's distinguishable from real Slack voter analytics.
 *
 * Local in-memory map layered on top of server state for optimistic UI —
 * QuestionDetail merges it with question.thumbsVotes by adminId.
 */
export function useThumbsVote(options: UseThumbsVoteOptions = {}) {
  const [votesByQuestion, setVotesByQuestion] = useState<
    Map<string, ThumbsVote[]>
  >(new Map());

  const vote = useCallback(
    (
      question: Question,
      adminId: string,
      adminName: string,
      value: "up" | "down",
    ) => {
      const dbVote = value === "up" ? "helpful" : "not_helpful";
      const voterSlackId = `admin:${adminId}`;

      // Optimistic local toggle (matches prior behavior: same value → remove).
      let action: "insert" | "delete" | "update" = "insert";
      setVotesByQuestion((prev) => {
        const next = new Map(prev);
        const current = [...(next.get(question.id) ?? [])];
        const idx = current.findIndex((v) => v.adminId === adminId);
        if (idx >= 0) {
          if (current[idx].vote === value) {
            current.splice(idx, 1);
            action = "delete";
          } else {
            current[idx] = { adminId, adminName, vote: value };
            action = "update";
          }
        } else {
          current.push({ adminId, adminName, vote: value });
          action = "insert";
        }
        next.set(question.id, current);
        return next;
      });

      // Persist. We fire-and-forget; on error, log and refetch to reconcile.
      const run = async () => {
        try {
          if (action === "delete") {
            await supabase
              .from("juju_feedback")
              .delete()
              .eq("parent_feedback_id", question.id)
              .eq("voter_slack_id", voterSlackId)
              .eq("vote", dbVote);
          } else {
            // For update: remove any existing admin vote first, then insert.
            if (action === "update") {
              await supabase
                .from("juju_feedback")
                .delete()
                .eq("parent_feedback_id", question.id)
                .eq("voter_slack_id", voterSlackId)
                .in("vote", ["helpful", "not_helpful"]);
            }
            await supabase.from("juju_feedback").insert({
              parent_feedback_id: question.id,
              question: question.questionText,
              answer_type: "synthesized",
              vote: dbVote,
              voter_slack_id: voterSlackId,
              voter_display_name: adminName,
              channel: extractChannel(question.slackThreadUrl),
              thread_ts: null,
              message_ts: null,
            });
          }
          options.onMutate?.();
        } catch (err) {
          console.error("[useThumbsVote] persist failed:", err);
          options.onMutate?.();
        }
      };
      void run();
    },
    [options],
  );

  const removeVote = useCallback(
    (questionId: string, adminId: string) => {
      setVotesByQuestion((prev) => {
        const next = new Map(prev);
        const votes = (next.get(questionId) ?? []).filter(
          (v) => v.adminId !== adminId,
        );
        next.set(questionId, votes);
        return next;
      });
      supabase
        .from("juju_feedback")
        .delete()
        .eq("parent_feedback_id", questionId)
        .eq("voter_slack_id", `admin:${adminId}`)
        .in("vote", ["helpful", "not_helpful"])
        .then(({ error }) => {
          if (error) console.error("[useThumbsVote] removeVote failed:", error);
          options.onMutate?.();
        });
    },
    [options],
  );

  const getVotes = useCallback(
    (questionId: string): ThumbsVote[] =>
      votesByQuestion.get(questionId) ?? [],
    [votesByQuestion],
  );

  return { vote, removeVote, getVotes };
}

// Extracts the Slack channel ID from a thread URL of the form
// https://slack.com/archives/<channel>/p<flat-ts>. Returns "" if the URL
// doesn't match — the child row still writes, just without channel/ts.
function extractChannel(url: string): string {
  const match = url.match(/\/archives\/([^/]+)\//);
  return match?.[1] ?? "";
}
