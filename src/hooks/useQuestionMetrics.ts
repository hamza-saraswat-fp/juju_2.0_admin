import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { TimeRange } from "@/lib/questionFilters";

interface MetricsRpcResponse {
  sparkline_messages: (number | null)[];
  sparkline_auto_resolve: (number | null)[];
  sparkline_unique_users_daily: (number | null)[];
  sparkline_open_escalations: (number | null)[];
  avg_messages_window: number | null;
  avg_messages_prior: number | null;
  auto_resolve_window: number | null;
  auto_resolve_prior: number | null;
  unique_users_window: number;
  unique_users_prior: number | null;
  open_escalations_now: number;
  open_escalations_window_ago: number | null;
}

export type Trend =
  | { kind: "percent"; value: number; goodDirection: "up" | "down" }
  | { kind: "pp"; value: number; goodDirection: "up" | "down" }
  | { kind: "absolute"; value: number; goodDirection: "up" | "down" }
  | null;

export interface MetricCard {
  primary: number | null;
  trend: Trend;
  sparkline: (number | null)[];
}

export interface QuestionMetrics {
  avgMessages: MetricCard;
  autoResolveRate: MetricCard;
  uniqueUsers: MetricCard;
  openEscalations: MetricCard;
}

function pctTrend(
  current: number | null,
  prior: number | null,
  goodDirection: "up" | "down",
): Trend {
  if (current === null || prior === null || prior === 0) return null;
  return {
    kind: "percent",
    value: ((current - prior) / prior) * 100,
    goodDirection,
  };
}

function ppTrend(
  current: number | null,
  prior: number | null,
  goodDirection: "up" | "down",
): Trend {
  if (current === null || prior === null) return null;
  return { kind: "pp", value: (current - prior) * 100, goodDirection };
}

function absTrend(
  current: number,
  prior: number | null,
  goodDirection: "up" | "down",
): Trend {
  if (prior === null) return null;
  return { kind: "absolute", value: current - prior, goodDirection };
}

/**
 * Fetches the 4 hero-card metrics for a specific time range. Each hero card
 * calls this hook with its own range so windows are independent.
 *
 * Sparkline arrays are always 14 daily values, oldest → newest, regardless
 * of the chosen window — they exist as a fixed visual context.
 */
export function useQuestionMetrics(timeRange: TimeRange) {
  const [data, setData] = useState<QuestionMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setIsLoading(true);
      setError(null);
      const { data: rpc, error: err } = await supabase.rpc(
        "get_question_log_metrics",
        { p_time_range: timeRange },
      );
      if (cancelled) return;
      if (err) {
        console.error("[useQuestionMetrics] fetch failed:", err);
        setError(err.message);
        setIsLoading(false);
        return;
      }

      const m = rpc as MetricsRpcResponse;

      setData({
        avgMessages: {
          primary: m.avg_messages_window,
          trend: pctTrend(m.avg_messages_window, m.avg_messages_prior, "up"),
          sparkline: m.sparkline_messages,
        },
        autoResolveRate: {
          primary: m.auto_resolve_window,
          trend: ppTrend(m.auto_resolve_window, m.auto_resolve_prior, "up"),
          sparkline: m.sparkline_auto_resolve,
        },
        uniqueUsers: {
          primary: m.unique_users_window,
          trend: pctTrend(m.unique_users_window, m.unique_users_prior, "up"),
          sparkline: m.sparkline_unique_users_daily,
        },
        openEscalations: {
          primary: m.open_escalations_now,
          trend: absTrend(
            m.open_escalations_now,
            m.open_escalations_window_ago,
            "down",
          ),
          sparkline: m.sparkline_open_escalations,
        },
      });
      setIsLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [timeRange]);

  return { metrics: data, isLoading, error };
}
