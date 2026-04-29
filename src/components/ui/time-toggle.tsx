import type { TimeRange } from "@/lib/questionFilters";
import { cn } from "@/lib/utils";

interface Props {
  value: TimeRange;
  onChange: (next: TimeRange) => void;
  options?: ReadonlyArray<TimeRange>;
  className?: string;
}

const LABELS: Record<TimeRange, string> = {
  "24h": "1D",
  "7d": "7D",
  "30d": "30D",
  all: "All",
};

const DEFAULT_OPTIONS: ReadonlyArray<TimeRange> = ["24h", "7d", "30d", "all"];

/**
 * Segmented time-range selector for individual cards.
 *
 *   [ 1D | 7D | 30D | All ]
 */
export function TimeToggle({
  value,
  onChange,
  options = DEFAULT_OPTIONS,
  className,
}: Props) {
  return (
    <div
      role="tablist"
      className={cn(
        "inline-flex rounded-lg border border-line bg-surface-deep p-0.5 text-xs",
        className,
      )}
    >
      {options.map((opt) => {
        const active = opt === value;
        return (
          <button
            key={opt}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(opt)}
            className={cn(
              "rounded-md px-2 py-0.5 font-medium leading-none transition-colors",
              active
                ? "bg-card text-on-surface shadow-[0_1px_2px_rgba(15,15,40,0.06)]"
                : "text-on-surface-variant hover:text-on-surface",
            )}
          >
            {LABELS[opt]}
          </button>
        );
      })}
    </div>
  );
}
