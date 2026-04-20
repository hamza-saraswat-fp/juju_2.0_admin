import type { SourceStats } from "@/types/knowledge";
import type { SourceType } from "@/types/question";

// ── Types ───────────────────────────────────────────────────

export type SourceSortKey = "citations" | "helpfulRate" | "lastModified" | "title";
export type SourceSortDir = "asc" | "desc";
export type StaleFilter = "all" | "fresh" | "aging" | "stale";

export interface SourceFilters {
  sourceType: SourceType | "ALL";
  staleStatus: StaleFilter;
  search: string;
}

export const DEFAULT_SOURCE_FILTERS: SourceFilters = {
  sourceType: "ALL",
  staleStatus: "all",
  search: "",
};

// ── Pure filter function ────────────────────────────────────

export function filterSources(
  sources: SourceStats[],
  filters: SourceFilters,
): SourceStats[] {
  return sources.filter((s) => {
    if (
      filters.sourceType !== "ALL" &&
      s.source.sourceType !== filters.sourceType
    )
      return false;

    if (filters.staleStatus !== "all" && s.staleStatus !== filters.staleStatus)
      return false;

    if (filters.search) {
      const q = filters.search.toLowerCase();
      if (
        !s.source.title.toLowerCase().includes(q) &&
        !s.source.owner.toLowerCase().includes(q)
      )
        return false;
    }

    return true;
  });
}

// ── Pure sort function ──────────────────────────────────────

export function sortSources(
  sources: SourceStats[],
  key: SourceSortKey,
  dir: SourceSortDir,
): SourceStats[] {
  const sorted = [...sources].sort((a, b) => {
    switch (key) {
      case "citations":
        return a.citations - b.citations;
      case "helpfulRate":
        return a.helpfulRate - b.helpfulRate;
      case "lastModified":
        return (
          new Date(a.source.lastModified).getTime() -
          new Date(b.source.lastModified).getTime()
        );
      case "title":
        return a.source.title.localeCompare(b.source.title);
    }
  });

  return dir === "desc" ? sorted.reverse() : sorted;
}
