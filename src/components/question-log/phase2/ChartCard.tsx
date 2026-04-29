import type { ReactNode } from "react";
import { Card } from "@/components/ui/card";
import { TimeToggle } from "@/components/ui/time-toggle";
import type { TimeRange } from "@/lib/questionFilters";
import { cn } from "@/lib/utils";

interface ChartCardProps {
  title: string;
  subtitle?: string;
  /** Optional per-card time-range toggle. Render in the card header. */
  range?: TimeRange;
  onRangeChange?: (next: TimeRange) => void;
  isEmpty?: boolean;
  isLoading?: boolean;
  className?: string;
  height?: number;
  children: ReactNode;
}

export function ChartCard({
  title,
  subtitle,
  range,
  onRangeChange,
  isEmpty,
  isLoading,
  className,
  height = 240,
  children,
}: ChartCardProps) {
  const showToggle = range !== undefined && onRangeChange !== undefined;
  return (
    <Card className={cn("flex flex-col p-5", className)}>
      <div className="mb-4">
        <div className="flex items-start justify-between gap-3">
          <h3 className="text-sm font-semibold tracking-tight">{title}</h3>
          {showToggle ? (
            <TimeToggle value={range} onChange={onRangeChange} />
          ) : null}
        </div>
        {subtitle && (
          <p className="mt-0.5 text-xs text-on-surface-variant">{subtitle}</p>
        )}
      </div>
      <div style={{ minHeight: height, height }} className="flex-1">
        {isLoading ? (
          <div className="h-full w-full animate-pulse rounded-lg bg-surface-deep" />
        ) : isEmpty ? (
          <div className="flex h-full items-center justify-center text-sm text-on-surface-faint">
            Not enough data yet
          </div>
        ) : (
          children
        )}
      </div>
    </Card>
  );
}
