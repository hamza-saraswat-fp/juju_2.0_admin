import {
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Check, ChevronDown, RotateCcw, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { CATEGORIES } from "@/types/question";
import { CATEGORY_LABELS, SUB_CATEGORIES } from "@/config/jujuTaxonomy";
import {
  DEFAULT_FILTERS,
  type EscalationFilter,
  type QuestionFilters,
  type RatingFilter,
  type VerifiedFilter,
} from "@/lib/questionFilters";
import { cn } from "@/lib/utils";

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
  const [localSearch, setLocalSearch] = useState(searchQuery);

  // Sync local state when searchQuery changes from outside (e.g. RepeatQuestions click).
  useEffect(() => {
    setLocalSearch(searchQuery);
  }, [searchQuery]);

  // Debounce local typing back to the parent. Skip when the values already
  // match (i.e. we just synced from props) to avoid bouncing.
  useEffect(() => {
    if (localSearch === searchQuery) return;
    const timer = setTimeout(() => onSearchChange(localSearch), 300);
    return () => clearTimeout(timer);
  }, [localSearch, searchQuery, onSearchChange]);

  const subCategoryOptions =
    filters.category === "ALL" ? [] : SUB_CATEGORIES[filters.category];

  // Time range is no longer surfaced in the filter bar (each card owns its
  // own time toggle), so we don't include it in active-state or reset.
  const isAnyFilterActive =
    filters.category !== DEFAULT_FILTERS.category ||
    filters.subCategory !== DEFAULT_FILTERS.subCategory ||
    filters.rating !== DEFAULT_FILTERS.rating ||
    filters.escalation !== DEFAULT_FILTERS.escalation ||
    filters.hasVerifiedAnswer !== DEFAULT_FILTERS.hasVerifiedAnswer ||
    localSearch.length > 0;

  const handleReset = () => {
    setLocalSearch("");
    onFilterChange("category", DEFAULT_FILTERS.category);
    onFilterChange("subCategory", DEFAULT_FILTERS.subCategory);
    onFilterChange("rating", DEFAULT_FILTERS.rating);
    onFilterChange("escalation", DEFAULT_FILTERS.escalation);
    onFilterChange("hasVerifiedAnswer", DEFAULT_FILTERS.hasVerifiedAnswer);
  };

  return (
    <div className="sticky top-16 z-40 mb-6 bg-surface/75 py-4 backdrop-blur-md">
      <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-line bg-card p-3 shadow-[var(--shadow-card)]">
        <div className="relative min-w-[220px] flex-grow">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-on-surface-faint" />
          <Input
            type="text"
            placeholder="Search questions, answers, verified answers…"
            value={localSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
            className="rounded-xl pl-9 focus-visible:ring-page-accent/30"
          />
        </div>

        <FilterDropdown
          label="Category"
          value={filters.category}
          defaultValue={DEFAULT_FILTERS.category}
          options={[
            { value: "ALL", label: "All categories", shortLabel: "All" },
            ...CATEGORIES.map((cat) => ({
              value: cat,
              label: CATEGORY_LABELS[cat],
            })),
          ]}
          onChange={(v) => {
            onFilterChange("category", v as QuestionFilters["category"]);
            onFilterChange("subCategory", "ALL");
          }}
        />

        {subCategoryOptions.length > 0 && (
          <FilterDropdown
            label="Sub"
            value={filters.subCategory}
            defaultValue="ALL"
            options={[
              { value: "ALL", label: "All sub-categories", shortLabel: "All" },
              ...subCategoryOptions.map((sub) => ({ value: sub, label: sub })),
            ]}
            onChange={(v) => onFilterChange("subCategory", v)}
          />
        )}

        <FilterDropdown
          label="Rating"
          value={filters.rating}
          defaultValue={DEFAULT_FILTERS.rating}
          options={
            [
              { value: "ALL", label: "All ratings", shortLabel: "All" },
              { value: "4-5", label: "😃🙂 Positive (4–5)" },
              { value: "3", label: "😐 Neutral (3)" },
              { value: "1-2", label: "😡😞 Negative (1–2)" },
              { value: "none", label: "Unrated" },
            ] as DropdownOption<RatingFilter>[]
          }
          onChange={(v) => onFilterChange("rating", v)}
        />

        <FilterDropdown
          label="Escalation"
          value={filters.escalation}
          defaultValue={DEFAULT_FILTERS.escalation}
          options={
            [
              { value: "ALL", label: "All escalations", shortLabel: "All" },
              { value: "none", label: "None" },
              { value: "any", label: "Any escalation" },
              { value: "auto", label: "🚨 Auto-escalated" },
              { value: "user", label: "🚨 User-escalated" },
            ] as DropdownOption<EscalationFilter>[]
          }
          onChange={(v) => onFilterChange("escalation", v)}
        />

        <FilterDropdown
          label="Verified"
          value={filters.hasVerifiedAnswer}
          defaultValue={DEFAULT_FILTERS.hasVerifiedAnswer}
          options={
            [
              { value: "ALL", label: "All", shortLabel: "All" },
              { value: "yes", label: "Verified only" },
              { value: "no", label: "Unverified only" },
            ] as DropdownOption<VerifiedFilter>[]
          }
          onChange={(v) => onFilterChange("hasVerifiedAnswer", v)}
        />

        {/* Time dropdown removed in Phase 4 — each card now owns its own
            time-range toggle. `filters.timeRange` is still kept in the
            QuestionFilters type for the underlying table search logic. */}

        {isAnyFilterActive && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleReset}
            className="ml-auto h-8 gap-1.5 text-on-surface-variant hover:text-on-surface"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Reset
          </Button>
        )}
      </div>
    </div>
  );
}

type DropdownOption<T extends string> = {
  value: T;
  label: ReactNode;
  shortLabel?: ReactNode;
};

function FilterDropdown<T extends string>({
  label,
  value,
  defaultValue,
  options,
  onChange,
}: {
  label: string;
  value: T;
  defaultValue: T;
  options: DropdownOption<T>[];
  onChange: (value: T) => void;
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const isActive = value !== defaultValue;
  const current = options.find((o) => o.value === value);
  const triggerLabel = isActive
    ? current?.label ?? value
    : current?.shortLabel ?? current?.label ?? value;

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "flex h-8 items-center gap-1.5 rounded-xl border border-line-strong bg-card px-3 text-sm text-on-surface transition-colors hover:border-page-accent/50",
          open && "border-page-accent ring-2 ring-page-accent/25",
          isActive &&
            !open &&
            "border-page-accent/40 ring-2 ring-page-accent/20",
        )}
      >
        <span className="text-on-surface-variant">{label}</span>
        <span className="max-w-[200px] truncate font-medium">
          {triggerLabel}
        </span>
        <ChevronDown
          className={cn(
            "h-3.5 w-3.5 text-on-surface-variant transition-transform",
            open && "rotate-180",
          )}
        />
      </button>
      {open && (
        <div
          role="listbox"
          className="absolute left-0 top-[calc(100%+4px)] z-50 min-w-[200px] origin-top overflow-hidden rounded-xl border border-line bg-popover py-1 shadow-[var(--shadow-card-hover)] animate-in fade-in-0 zoom-in-95 slide-in-from-top-1 duration-150"
        >
          {options.map((o) => {
            const selected = o.value === value;
            return (
              <button
                key={o.value}
                type="button"
                role="option"
                aria-selected={selected}
                onClick={() => {
                  onChange(o.value);
                  setOpen(false);
                }}
                className={cn(
                  "flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm transition-colors hover:bg-page-accent/10",
                  selected
                    ? "font-medium text-page-accent-deep"
                    : "text-on-surface",
                )}
              >
                <span className="flex-1">{o.label}</span>
                {selected && (
                  <Check className="h-3.5 w-3.5 text-page-accent-deep" />
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
