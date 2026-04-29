import { TimeToggle } from "@/components/ui/time-toggle";
import type { TimeRange } from "@/lib/questionFilters";
import { cn } from "@/lib/utils";

interface Props {
  title: string;
  subtitle?: string;
  range: TimeRange;
  onRangeChange: (next: TimeRange) => void;
  options?: ReadonlyArray<TimeRange>;
  className?: string;
}

/**
 * Standard card-header layout with a time-range toggle. Used by every chart
 * card on the Question Log so users can change each card's window
 * independently of the global filter bar.
 */
export function CardTimeRange({
  title,
  subtitle,
  range,
  onRangeChange,
  options,
  className,
}: Props) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-start justify-between gap-3",
        className,
      )}
    >
      <div className="min-w-0">
        <h3 className="text-sm font-semibold tracking-tight">{title}</h3>
        {subtitle && (
          <p className="mt-0.5 text-xs text-on-surface-variant">{subtitle}</p>
        )}
      </div>
      <TimeToggle value={range} onChange={onRangeChange} options={options} />
    </div>
  );
}
