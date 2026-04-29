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
import { ChartCard } from "./ChartCard";
import { useQuestionPhase2 } from "@/hooks/useQuestionPhase2";
import type { QuestionFilters, TimeRange } from "@/lib/questionFilters";

interface Props {
  filters: QuestionFilters;
}

function formatDay(iso: string): string {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function VolumeOverTime({ filters }: Props) {
  const [range, setRange] = useState<TimeRange>("7d");
  const { data, isLoading } = useQuestionPhase2({
    ...filters,
    timeRange: range,
  });
  const volume = data?.volume_over_time ?? [];
  const empty =
    !isLoading && (volume.length === 0 || volume.every((d) => d.count === 0));

  return (
    <ChartCard
      title="Volume over time"
      subtitle="Daily questions · 7-day rolling avg"
      range={range}
      onRangeChange={setRange}
      isLoading={isLoading}
      isEmpty={empty}
    >
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={volume} margin={{ top: 5, right: 12, left: -10, bottom: 0 }}>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="rgba(20,20,30,0.06)"
            vertical={false}
          />
          <XAxis
            dataKey="day"
            tickFormatter={formatDay}
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
            width={32}
            allowDecimals={false}
          />
          <Tooltip
            contentStyle={{
              borderRadius: 12,
              border: "1px solid rgba(20,20,30,0.10)",
              boxShadow: "0 8px 24px -12px rgba(15,15,40,0.18)",
              fontSize: 12,
            }}
            labelFormatter={(label) => formatDay(String(label))}
            formatter={(value, name) => {
              const v = typeof value === "number" ? value : Number(value);
              if (name === "rolling_7") {
                return [Number.isFinite(v) ? v.toFixed(1) : "—", "7-day avg"];
              }
              return [v, "Questions"];
            }}
          />
          <Line
            type="monotone"
            dataKey="count"
            stroke="var(--color-page-accent)"
            strokeWidth={1.75}
            dot={false}
            name="count"
          />
          <Line
            type="monotone"
            dataKey="rolling_7"
            stroke="var(--color-page-accent)"
            strokeOpacity={0.45}
            strokeWidth={1.5}
            strokeDasharray="4 3"
            dot={false}
            name="rolling_7"
          />
        </LineChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}
