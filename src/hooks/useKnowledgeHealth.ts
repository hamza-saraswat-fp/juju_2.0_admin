import { useMemo } from "react";
import {
  mockSourceStats,
  mockCoverageGaps,
  mockUnmatchedQuestions,
} from "@/data/mockSources";
import type {
  SourceStats,
  CoverageGap,
  UnmatchedQuestion,
  KnowledgeHealthStats,
} from "@/types/knowledge";

/**
 * Single data-access hook for the Knowledge Health page.
 *
 * Swap point for Supabase: replace mock imports with queries.
 * The interface stays the same.
 */
export function useKnowledgeHealth(): {
  sources: SourceStats[];
  stats: KnowledgeHealthStats;
  coverageGaps: CoverageGap[];
  unmatchedQuestions: UnmatchedQuestion[];
  staleSources: SourceStats[];
} {
  const sources = mockSourceStats;
  const coverageGaps = mockCoverageGaps;
  const unmatchedQuestions = mockUnmatchedQuestions;

  const staleSources = useMemo(
    () => sources.filter((s) => s.staleStatus === "stale"),
    [sources],
  );

  const stats = useMemo((): KnowledgeHealthStats => {
    const totalCitations = sources.reduce((sum, s) => sum + s.citations, 0);
    const avgHelpfulRate =
      sources.length > 0
        ? Math.round(
            sources.reduce((sum, s) => sum + s.helpfulRate, 0) /
              sources.length,
          )
        : 0;

    const alerts = [];
    if (staleSources.length > 0) {
      alerts.push({
        id: "alert-stale",
        type: "warning" as const,
        label: `${staleSources.length} STALE SOURCES`,
        description: "Require immediate re-validation",
      });
    }
    if (coverageGaps.length > 0) {
      const worst = coverageGaps.reduce((a, b) =>
        a.unansweredRate > b.unansweredRate ? a : b,
      );
      alerts.push({
        id: "alert-gap",
        type: "info" as const,
        label: "NEW COVERAGE GAP",
        description: `${worst.description.slice(0, 50)}...`,
      });
    }

    return {
      totalCitations,
      avgHelpfulRate,
      staleSourceCount: staleSources.length,
      coverageGapCount: coverageGaps.length,
      alerts,
    };
  }, [sources, staleSources, coverageGaps]);

  return { sources, stats, coverageGaps, unmatchedQuestions, staleSources };
}
