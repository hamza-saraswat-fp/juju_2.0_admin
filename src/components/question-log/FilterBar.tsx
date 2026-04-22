import { useState, useEffect } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { CATEGORIES } from "@/types/question";
import type { ConfidenceTier, FeedbackState } from "@/types/question";
import type { QuestionFilters, TimeRange } from "@/lib/questionFilters";
import { cn, formatCategory } from "@/lib/utils";

interface FilterBarProps {
  filters: QuestionFilters;
  searchQuery: string;
  onFilterChange: <K extends keyof QuestionFilters>(
    key: K,
    value: QuestionFilters[K],
  ) => void;
  onSearchChange: (query: string) => void;
}

export function FilterBar({
  filters,
  searchQuery,
  onFilterChange,
  onSearchChange,
}: FilterBarProps) {
  // Debounced search — 300ms
  const [localSearch, setLocalSearch] = useState(searchQuery);
  useEffect(() => {
    const timer = setTimeout(() => onSearchChange(localSearch), 300);
    return () => clearTimeout(timer);
  }, [localSearch, onSearchChange]);

  return (
    <div className="sticky top-16 z-40 mb-6 bg-background/80 py-4 backdrop-blur-sm">
      <div className="flex flex-wrap items-center gap-3 rounded-lg border bg-card p-2">
        {/* Search */}
        <div className="relative min-w-[200px] flex-grow">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search questions & answers..."
            value={localSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        <Divider />

        {/* Category */}
        <FilterGroup label="Category">
          <Pill
            active={filters.category === "ALL"}
            onClick={() => onFilterChange("category", "ALL")}
          >
            All
          </Pill>
          {CATEGORIES.map((cat) => (
            <Pill
              key={cat}
              active={filters.category === cat}
              onClick={() => onFilterChange("category", cat)}
            >
              {formatCategory(cat)}
            </Pill>
          ))}
        </FilterGroup>

        <Divider />

        {/* Confidence */}
        <FilterGroup label="Confidence">
          {(["ALL", "high", "medium", "low"] as const).map((tier) => (
            <Pill
              key={tier}
              active={filters.confidenceTier === tier}
              onClick={() =>
                onFilterChange(
                  "confidenceTier",
                  tier as ConfidenceTier | "ALL",
                )
              }
            >
              {tier === "ALL"
                ? "All"
                : tier.charAt(0).toUpperCase() + tier.slice(1)}
            </Pill>
          ))}
        </FilterGroup>

        <Divider />

        {/* Time Range */}
        <FilterGroup label="Time">
          {(
            [
              ["24h", "24h"],
              ["7d", "7 days"],
              ["30d", "30 days"],
              ["all", "All time"],
            ] as [TimeRange, string][]
          ).map(([value, label]) => (
            <Pill
              key={value}
              active={filters.timeRange === value}
              onClick={() => onFilterChange("timeRange", value)}
            >
              {label}
            </Pill>
          ))}
        </FilterGroup>

        <Divider />

        {/* Feedback */}
        <FilterGroup label="Feedback">
          {(
            [
              ["ALL", "All"],
              ["positive", "👍"],
              ["negative", "👎"],
              ["none", "None"],
            ] as [FeedbackState | "ALL", string][]
          ).map(([value, label]) => (
            <Pill
              key={value}
              active={filters.feedbackState === value}
              onClick={() => onFilterChange("feedbackState", value)}
            >
              {label}
            </Pill>
          ))}
        </FilterGroup>

      </div>
    </div>
  );
}

// ── Sub-components ──────────────────────────────────────────

function FilterGroup({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-2 px-1">
      <span className="text-[0.6875rem] font-semibold uppercase tracking-widest text-muted-foreground">
        {label}
      </span>
      <div className="flex gap-0.5 rounded-md bg-muted p-0.5">{children}</div>
    </div>
  );
}

function Pill({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <Button
      variant={active ? "default" : "ghost"}
      size="sm"
      onClick={onClick}
      className={cn(
        "h-7 rounded-sm px-2.5 text-xs font-medium",
        active && "bg-primary-navy text-white hover:bg-primary-navy/90",
        !active && "text-muted-foreground hover:text-foreground",
      )}
    >
      {children}
    </Button>
  );
}

function Divider() {
  return <div className="hidden h-8 w-px bg-border sm:block" />;
}
