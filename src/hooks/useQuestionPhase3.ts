import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { QuestionFilters, TimeRange } from "@/lib/questionFilters";

export interface AutoResolveWeekPoint {
  week_start: string;
  rate: number | null;
  total: number;
}

export interface QuestionPhase3 {
  /** 168-element flat array, dow*24 + hour. Mon=0..Sun=6, hour=0..23, Chicago. */
  heatmap: number[];
  /** Weekly entries oldest→newest (length depends on time range). */
  auto_resolve_weekly: AutoResolveWeekPoint[];
}

/**
 * Tier 3 metrics. Lazy: pass `enabled = false` to skip the network call when
 * the disclosure is collapsed. Each consumer can pick its own time range so
 * heatmap and weekly trend can be windowed independently.
 */
export function useQuestionPhase3(
  timeRange: TimeRange,
  filters: QuestionFilters,
  enabled: boolean,
) {
  const [data, setData] = useState<QuestionPhase3 | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const category = filters.category;
  const escalation = filters.escalation;
  const verified = filters.hasVerifiedAnswer;

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    (async () => {
      setIsLoading(true);
      setError(null);
      const { data: rpc, error: err } = await supabase.rpc(
        "get_question_log_phase3",
        {
          p_time_range: timeRange,
          p_category: category,
          p_escalation: escalation,
          p_verified: verified,
        },
      );
      if (cancelled) return;
      if (err) {
        console.error("[useQuestionPhase3] fetch failed:", err);
        setError(err.message);
        setIsLoading(false);
        return;
      }
      setData(rpc as QuestionPhase3);
      setIsLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [enabled, timeRange, category, escalation, verified]);

  return { data, isLoading, error };
}
