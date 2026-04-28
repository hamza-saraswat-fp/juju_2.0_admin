import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { mapRowToQuestion, type ParentRow } from "@/lib/questionMapper";
import type { Question, QuestionStats } from "@/types/question";

const SELECT = `
  id, question, answer_text, answer_type,
  category, sub_category, category_confidence,
  manual_category_override, answer_confidence, latency_ms,
  created_at, message_ts, channel, thread_ts,
  asker_slack_id, mintlify_sources, confluence_sources, search_queries,
  escalated_at, escalated_to, escalation_type, escalation_triggered_by,
  failure_type, failure_confidence,
  children:juju_feedback!parent_feedback_id (
    id, vote, star_rating, voter_slack_id, voter_display_name,
    written_feedback, manual_category_override, message_ts, created_at
  )
`;

/**
 * Reads parent rows from juju_feedback with their children embedded via the
 * self-referential FK on parent_feedback_id. Parents are identified by
 * parent_feedback_id IS NULL AND vote IS NULL AND star_rating IS NULL AND
 * answer_text IS NOT NULL.
 *
 * Read-only hook. All mutations to juju_feedback originate from the Slack bot.
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
      .is("star_rating", null)
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

  const stats = useMemo((): QuestionStats => {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayMs = todayStart.getTime();

    const todays = questions.filter(
      (q) => new Date(q.askedAt).getTime() >= todayMs,
    );
    const questionsToday = todays.length;

    const ratingsToday = todays.flatMap((q) => q.ratings);
    const ratingCountToday = ratingsToday.length;
    const avgRatingToday =
      ratingCountToday > 0
        ? ratingsToday.reduce((sum, r) => sum + r.stars, 0) / ratingCountToday
        : null;

    const escalatedTodayQuestions = todays.filter((q) => q.escalation !== null);
    const escalatedToday = escalatedTodayQuestions.length;
    const escalatedTodayAuto = escalatedTodayQuestions.filter(
      (q) => q.escalation?.type === "auto",
    ).length;
    const escalatedTodayUser = escalatedTodayQuestions.filter(
      (q) => q.escalation?.type === "user",
    ).length;

    // Top sub-category among today's questions; fall back to top category if
    // no questions had a sub-category.
    const subCounts = new Map<string, number>();
    for (const q of todays) {
      if (!q.subCategory) continue;
      subCounts.set(q.subCategory, (subCounts.get(q.subCategory) ?? 0) + 1);
    }
    let topSubCategory: QuestionStats["topSubCategory"] = null;
    for (const [label, count] of subCounts) {
      if (!topSubCategory || count > topSubCategory.count) {
        topSubCategory = { label, count };
      }
    }

    const needsAttentionCount = questions.filter(
      (q) => q.escalation !== null && q.verifiedAnswer === null,
    ).length;

    return {
      questionsToday,
      avgRatingToday,
      ratingCountToday,
      escalatedToday,
      escalatedTodayAuto,
      escalatedTodayUser,
      topSubCategory,
      needsAttentionCount,
    };
  }, [questions]);

  return {
    questions,
    stats,
    getById,
    isLoading,
    error,
    refetch: fetchQuestions,
  };
}
