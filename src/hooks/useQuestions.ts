import { useState, useCallback, useMemo } from "react";
import { mockQuestions } from "@/data/mockQuestions";
import type { Question, QuestionStats, Category } from "@/types/question";

/**
 * Single data-access hook for questions.
 *
 * Swap point for Supabase: replace `mockQuestions` import with a Supabase
 * query. The interface returned by this hook stays the same.
 *
 * NO filtering here — filtering is a pure function in lib/questionFilters.ts,
 * called by the UI layer.
 *
 * NO voting here — that's in useThumbsVote.
 */
export function useQuestions() {
  const [questions, setQuestions] = useState<Question[]>(
    () => [...mockQuestions].sort(
      (a, b) => new Date(b.askedAt).getTime() - new Date(a.askedAt).getTime(),
    ),
  );

  const getById = useCallback(
    (id: string): Question | null =>
      questions.find((q) => q.id === id) ?? null,
    [questions],
  );

  const overrideCategory = useCallback(
    (id: string, category: Category | null) => {
      setQuestions((prev) =>
        prev.map((q) =>
          q.id === id ? { ...q, manualCategoryOverride: category } : q,
        ),
      );
    },
    [],
  );

  const stats = useMemo((): QuestionStats => {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayMs = todayStart.getTime();

    // Questions today
    const questionsToday = questions.filter(
      (q) => new Date(q.askedAt).getTime() >= todayMs,
    ).length;

    // Thumbs up rate — % of all individual votes that are "up"
    const allVotes = questions.flatMap((q) => q.thumbsVotes);
    const totalVotes = allVotes.length;
    const upVotes = allVotes.filter((v) => v.vote === "up").length;
    const thumbsUpRate =
      totalVotes > 0 ? Math.round((upVotes / totalVotes) * 100) : 0;

    // Unanswered count
    const unansweredCount = questions.filter((q) => !q.isAnswered).length;

    // Top category (uses override if present)
    const categoryCounts = new Map<Category, number>();
    for (const q of questions) {
      const cat = q.manualCategoryOverride ?? q.aiCategory;
      categoryCounts.set(cat, (categoryCounts.get(cat) ?? 0) + 1);
    }
    let topCategory: QuestionStats["topCategory"] = {
      category: questions[0]?.aiCategory ?? ("OTHER" as Category),
      count: 0,
    };
    for (const [category, count] of categoryCounts) {
      if (count > topCategory.count) {
        topCategory = { category, count };
      }
    }

    // Low confidence count (confidence < 60)
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

  return { questions, stats, getById, overrideCategory };
}
