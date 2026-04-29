import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { QuestionFilters, TimeRange } from "@/lib/questionFilters";

/**
 * Human-readable label for a window, used in chart subtitles.
 * Matches the window math the RPC uses (24h → today, all → 90 days cap).
 */
export function timeRangeLabel(tr: TimeRange): {
  days: string;
  weeks: string;
} {
  switch (tr) {
    case "24h":
      return { days: "today", weeks: "this week" };
    case "7d":
      return { days: "last 7 days", weeks: "this week" };
    case "30d":
      return { days: "last 30 days", weeks: "last ~5 weeks" };
    case "all":
      return { days: "last 90 days", weeks: "last 13 weeks" };
  }
}

export interface VolumePoint {
  day: string;
  count: number;
  rolling_7: number | null;
}

export interface EscalationWeekPoint {
  week_start: string;
  auto: number;
  user: number;
}

export interface CategoryCountPoint {
  category: string;
  count: number;
}

export interface CategoryRatePoint {
  category: string;
  total: number;
  rate: number;
}

export interface POLeaderboardEntry {
  slack_id: string;
  tagged: number;
  verified: number;
  verified_rate: number | null;
  avg_response_hours: number | null;
}

export interface RepeatQuestion {
  question: string;
  count: number;
}

export interface QuestionPhase2 {
  volume_over_time: VolumePoint[];
  escalation_composition: EscalationWeekPoint[];
  top_categories: CategoryCountPoint[];
  escalation_rate_by_category: CategoryRatePoint[];
  po_leaderboard: POLeaderboardEntry[];
  repeat_questions: RepeatQuestion[];
}

/**
 * Tier 2 metrics, parametrized by filter-bar state. The Phase 2 RPC accepts
 * (p_time_range, p_category, p_escalation, p_verified) and only the subset of
 * filters relevant to each chart is honored server-side.
 */
export function useQuestionPhase2(filters: QuestionFilters) {
  const [data, setData] = useState<QuestionPhase2 | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Only the four filter fields the RPC actually uses; ignoring rating /
  // sub-category / search / needs-attention so we don't trigger unnecessary
  // re-fetches when those change.
  const timeRange = filters.timeRange;
  const category = filters.category;
  const escalation = filters.escalation;
  const verified = filters.hasVerifiedAnswer;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setIsLoading(true);
      setError(null);
      const { data: rpc, error: err } = await supabase.rpc(
        "get_question_log_phase2",
        {
          p_time_range: timeRange,
          p_category: category,
          p_escalation: escalation,
          p_verified: verified,
        },
      );
      if (cancelled) return;
      if (err) {
        console.error("[useQuestionPhase2] fetch failed:", err);
        setError(err.message);
        setIsLoading(false);
        return;
      }
      setData(rpc as QuestionPhase2);
      setIsLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [timeRange, category, escalation, verified]);

  return { data, isLoading, error };
}
