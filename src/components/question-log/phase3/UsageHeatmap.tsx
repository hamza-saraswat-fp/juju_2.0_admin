import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { TimeToggle } from "@/components/ui/time-toggle";
import { Tooltip } from "@/components/ui/tooltip";
import { useQuestionPhase3 } from "@/hooks/useQuestionPhase3";
import type { QuestionFilters, TimeRange } from "@/lib/questionFilters";
import { cn } from "@/lib/utils";

interface Props {
  filters: QuestionFilters;
  enabled: boolean;
}

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;
const HOUR_TICKS = [0, 6, 12, 18];

/**
 * 7×24 inline-grid heatmap of question volume. Cell color is `bg-page-accent`
 * with opacity scaled to count / max. Hover via Base UI tooltip.
 */
export function UsageHeatmap({ filters, enabled }: Props) {
  const [range, setRange] = useState<TimeRange>("30d");
  const { data, isLoading } = useQuestionPhase3(range, filters, enabled);
  const heatmap = data?.heatmap ?? [];

  const max = useMemo(
    () => Math.max(0, ...(heatmap.length === 168 ? heatmap : [])),
    [heatmap],
  );
  const total = useMemo(
    () => (heatmap.length === 168 ? heatmap.reduce((a, b) => a + b, 0) : 0),
    [heatmap],
  );

  return (
    <Card className="bg-card-soft p-5">
      <Header total={isLoading ? null : total} range={range} onRangeChange={setRange} />
      {isLoading ? (
        <div className="mt-4 h-[180px] animate-pulse rounded-lg bg-surface-deep" />
      ) : total === 0 ? (
        <p className="mt-6 text-center text-sm text-on-surface-faint">
          Not enough data yet
        </p>
      ) : (
        <>
          <div className="mt-4 flex gap-2">
            {/* Day labels (left axis) */}
            <div className="grid grid-rows-7 gap-[2px] pr-1 pt-3 text-[10px] text-on-surface-variant">
              {DAYS.map((d) => (
                <div key={d} className="flex h-4 items-center">
                  {d}
                </div>
              ))}
            </div>

            <div className="flex-1">
              {/* Hour labels (top axis) */}
              <div
                className="mb-1 grid text-[10px] text-on-surface-faint"
                style={{ gridTemplateColumns: "repeat(24, minmax(0, 1fr))" }}
              >
                {Array.from({ length: 24 }, (_, h) => (
                  <div key={h} className="text-center">
                    {HOUR_TICKS.includes(h) ? `${h}:00` : ""}
                  </div>
                ))}
              </div>
              {/* Cells */}
              <div
                className="grid gap-[2px]"
                style={{ gridTemplateColumns: "repeat(24, minmax(0, 1fr))" }}
              >
                {Array.from({ length: 7 }, (_, dow) =>
                  Array.from({ length: 24 }, (_, hour) => {
                    const count = heatmap[dow * 24 + hour] ?? 0;
                    const opacity = max === 0 ? 0 : count / max;
                    return (
                      <Tooltip
                        key={`${dow}-${hour}`}
                        content={`${DAYS[dow]} · ${String(hour).padStart(2, "0")}:00 · ${count} ${count === 1 ? "question" : "questions"}`}
                        side="top"
                      >
                        <div
                          className={cn(
                            "aspect-square rounded-[3px] border border-line",
                            count === 0 && "bg-surface-deep",
                          )}
                          style={
                            count > 0
                              ? {
                                  backgroundColor: `rgb(from var(--color-page-accent) r g b / ${0.15 + opacity * 0.85})`,
                                }
                              : undefined
                          }
                        />
                      </Tooltip>
                    );
                  }),
                )}
              </div>
            </div>
          </div>
          <p className="mt-3 text-[10px] text-on-surface-faint">
            Rows: Monday → Sunday · Columns: 0:00 → 23:00 (Chicago)
          </p>
        </>
      )}
    </Card>
  );
}

function Header({
  total,
  range,
  onRangeChange,
}: {
  total: number | null;
  range: TimeRange;
  onRangeChange: (r: TimeRange) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div>
        <h3 className="text-sm font-semibold tracking-tight">
          Question volume by day &amp; hour
        </h3>
        <p className="mt-0.5 text-xs text-on-surface-variant">
          {total === null ? "Loading…" : `${total} questions`}
        </p>
      </div>
      <TimeToggle value={range} onChange={onRangeChange} />
    </div>
  );
}
