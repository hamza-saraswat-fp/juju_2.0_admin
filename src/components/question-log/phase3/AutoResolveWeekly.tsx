import { useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card } from "@/components/ui/card";
import { TimeToggle } from "@/components/ui/time-toggle";
import { useQuestionPhase3 } from "@/hooks/useQuestionPhase3";
import type { QuestionFilters, TimeRange } from "@/lib/questionFilters";

interface Props {
  filters: QuestionFilters;
  enabled: boolean;
}

const MIN_WEEKS_REQUIRED = 4;

function formatWeek(iso: string): string {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function AutoResolveWeekly({ filters, enabled }: Props) {
  const [range, setRange] = useState<TimeRange>("all");
  const { data, isLoading } = useQuestionPhase3(range, filters, enabled);
  const weeks = data?.auto_resolve_weekly ?? [];
  const weeksWithData = weeks.filter((d) => d.total > 0).length;

  const display = weeks.map((d) => ({
    ...d,
    pct: d.rate !== null ? Math.round(d.rate * 100) : null,
  }));

  return (
    <Card className="bg-card-soft p-5">
      <Header range={range} onRangeChange={setRange} />
      {isLoading ? (
        <div className="mt-4 h-[200px] animate-pulse rounded-lg bg-surface-deep" />
      ) : weeksWithData < MIN_WEEKS_REQUIRED ? (
        <div className="mt-6 rounded-lg border border-dashed border-line-strong px-5 py-8 text-center text-sm text-on-surface-faint">
          Available once Juju has {MIN_WEEKS_REQUIRED}+ weeks of history.
          <br />
          <span className="text-xs">
            Currently tracking {weeksWithData} week
            {weeksWithData === 1 ? "" : "s"}.
          </span>
        </div>
      ) : (
        <div className="mt-4" style={{ height: 200 }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={display}
              margin={{ top: 5, right: 12, left: -10, bottom: 0 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="rgba(20,20,30,0.06)"
                vertical={false}
              />
              <XAxis
                dataKey="week_start"
                tickFormatter={formatWeek}
                tick={{ fontSize: 11, fill: "var(--color-on-surface-variant)" }}
                axisLine={{ stroke: "rgba(20,20,30,0.06)" }}
                tickLine={false}
                interval="preserveStartEnd"
                minTickGap={36}
              />
              <YAxis
                tick={{ fontSize: 11, fill: "var(--color-on-surface-variant)" }}
                axisLine={{ stroke: "rgba(20,20,30,0.06)" }}
                tickLine={false}
                width={40}
                domain={[0, 100]}
                tickFormatter={(v) => `${v}%`}
              />
              <Tooltip
                contentStyle={{
                  borderRadius: 12,
                  border: "1px solid rgba(20,20,30,0.10)",
                  boxShadow: "0 8px 24px -12px rgba(15,15,40,0.18)",
                  fontSize: 12,
                }}
                labelFormatter={(label) => `Week of ${formatWeek(String(label))}`}
                formatter={(_value, _name, item) => {
                  const payload = item?.payload as
                    | { pct?: number | null; total?: number }
                    | undefined;
                  if (
                    payload?.pct === null ||
                    payload?.pct === undefined
                  )
                    return ["—", "Auto-resolve rate"];
                  return [
                    `${payload.pct}% (${payload.total} questions)`,
                    "Auto-resolve rate",
                  ];
                }}
              />
              <Line
                type="monotone"
                dataKey="pct"
                stroke="var(--color-page-accent)"
                strokeWidth={1.75}
                dot={{ r: 3, fill: "var(--color-page-accent)" }}
                connectNulls={false}
                name="pct"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </Card>
  );
}

function Header({
  range,
  onRangeChange,
}: {
  range: TimeRange;
  onRangeChange: (r: TimeRange) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div>
        <h3 className="text-sm font-semibold tracking-tight">
          Auto-resolve rate
        </h3>
        <p className="mt-0.5 text-xs text-on-surface-variant">Weekly trend</p>
      </div>
      <TimeToggle value={range} onChange={onRangeChange} />
    </div>
  );
}
