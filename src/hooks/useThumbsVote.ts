import { useState, useCallback } from "react";
import type { ThumbsVote } from "@/types/question";

/**
 * Separate hook for admin thumbs voting.
 *
 * Persists in-memory for the session (React state).
 * Toggle behavior: voting the same value again removes the vote.
 *
 * In production, this would POST to Supabase and invalidate the
 * useQuestions cache.
 */
export function useThumbsVote() {
  // Map of questionId → ThumbsVote[]
  const [votesByQuestion, setVotesByQuestion] = useState<
    Map<string, ThumbsVote[]>
  >(new Map());

  const vote = useCallback(
    (
      questionId: string,
      adminId: string,
      adminName: string,
      value: "up" | "down",
    ) => {
      setVotesByQuestion((prev) => {
        const next = new Map(prev);
        const votes = [...(next.get(questionId) ?? [])];
        const existingIdx = votes.findIndex((v) => v.adminId === adminId);

        if (existingIdx >= 0) {
          // Toggle: same value → remove; different value → change
          if (votes[existingIdx].vote === value) {
            votes.splice(existingIdx, 1);
          } else {
            votes[existingIdx] = { adminId, adminName, vote: value };
          }
        } else {
          votes.push({ adminId, adminName, vote: value });
        }

        next.set(questionId, votes);
        return next;
      });
    },
    [],
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
    },
    [],
  );

  const getVotes = useCallback(
    (questionId: string): ThumbsVote[] => {
      return votesByQuestion.get(questionId) ?? [];
    },
    [votesByQuestion],
  );

  return { vote, removeVote, getVotes };
}
