import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { mapRowToQuestion, type ParentRow } from "@/lib/questionMapper";
import type { Category, Question, QuestionStats } from "@/types/question";

const SELECT = `
  id, question, answer_text, category, category_confidence,
  manual_category_override, answer_confidence, latency_ms, created_at,
  message_ts, channel, thread_ts, voter_slack_id, voter_display_name,
  mintlify_sources, confluence_sources,
  children:juju_feedback!parent_feedback_id (
    id, vote, voter_slack_id, voter_display_name,
    written_feedback, created_at, escalated_to_confluence
  )
`;

/**
 * Single data-access hook for questions.
 *
 * Reads parent rows from juju_feedback with their children embedded via the
 * self-referential FK on parent_feedback_id. Parents are identified by
 * parent_feedback_id IS NULL AND vote IS NULL AND answer_text IS NOT NULL.
 *
 * Filtering lives in lib/questionFilters.ts (pure function).
 * Voting lives in useThumbsVote (inserts child rows).
 */
export function useQuestions() {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchQuestions = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    const { data, error: err } = await supabase
      .from("juju_feedback")
      .select(SELECT)
      .is("parent_feedback_id", null)
      .is("vote", null)
      .not("answer_text", "is", null)
      .order("created_at", { ascending: false })
      .limit(500);

    if (err) {
      console.error("[useQuestions] fetch failed:", err);
      setError(err.message);
      setIsLoading(false);
      return;
    }

    const rows = (data ?? []) as unknown as ParentRow[];
    setQuestions(rows.map(mapRowToQuestion));
    setIsLoading(false);
  }, []);

  useEffect(() => {
    fetchQuestions();
  }, [fetchQuestions]);

  const getById = useCallback(
    (id: string): Question | null =>
      questions.find((q) => q.id === id) ?? null,
    [questions],
  );

  const overrideCategory = useCallback(
    (id: string, category: Category | null) => {
      // Optimistic update
      setQuestions((prev) =>
        prev.map((q) =>
          q.id === id ? { ...q, manualCategoryOverride: category } : q,
        ),
      );

      // Fire-and-forget persist
      supabase
        .from("juju_feedback")
        .update({ manual_category_override: category })
        .eq("id", id)
        .then(({ error: err }) => {
          if (err) {
            console.error("[useQuestions] overrideCategory failed:", err);
            // Roll back to whatever the server says
            fetchQuestions();
          }
        });
    },
    [fetchQuestions],
  );

  const stats = useMemo((): QuestionStats => {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayMs = todayStart.getTime();

    const questionsToday = questions.filter(
      (q) => new Date(q.askedAt).getTime() >= todayMs,
    ).length;

    const allVotes = questions.flatMap((q) => q.thumbsVotes);
    const totalVotes = allVotes.length;
    const upVotes = allVotes.filter((v) => v.vote === "up").length;
    const thumbsUpRate =
      totalVotes > 0 ? Math.round((upVotes / totalVotes) * 100) : 0;

    const unansweredCount = questions.filter((q) => q.needsReview).length;

    const categoryCounts = new Map<Category, number>();
    for (const q of questions) {
      const cat = q.manualCategoryOverride ?? q.aiCategory;
      categoryCounts.set(cat, (categoryCounts.get(cat) ?? 0) + 1);
    }
    let topCategory: QuestionStats["topCategory"] = {
      category: questions[0]?.aiCategory ?? ("general" as Category),
      count: 0,
    };
    for (const [category, count] of categoryCounts) {
      if (count > topCategory.count) {
        topCategory = { category, count };
      }
    }

    const lowConfidenceCount = questions.filter(
      (q) => q.confidence < 60,
    ).length;

    return {
      questionsToday,
      thumbsUpRate,
      unansweredCount,
      topCategory,
      lowConfidenceCount,
    };
  }, [questions]);

  return {
    questions,
    stats,
    getById,
    overrideCategory,
    isLoading,
    error,
    refetch: fetchQuestions,
  };
}
