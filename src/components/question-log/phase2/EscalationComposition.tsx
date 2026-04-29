import { useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
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

function formatWeekShort(iso: string): string {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function formatWeekRange(iso: string): string {
  const start = new Date(iso + "T00:00:00");
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  const m = (d: Date) =>
    d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  return `${m(start)} – ${m(end)}`;
}

export function EscalationComposition({ filters }: Props) {
  const [range, setRange] = useState<TimeRange>("7d");
  const { data, isLoading } = useQuestionPhase2({
    ...filters,
    timeRange: range,
  });
  const composition = data?.escalation_composition ?? [];
  const empty =
    !isLoading &&
    (composition.length === 0 ||
      composition.every((d) => d.auto === 0 && d.user === 0));

  return (
    <ChartCard
      title="Escalation composition"
      subtitle="Auto vs. user escalations, weekly buckets"
      range={range}
      onRangeChange={setRange}
      isLoading={isLoading}
      isEmpty={empty}
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={composition} margin={{ top: 5, right: 12, left: -10, bottom: 0 }}>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="rgba(20,20,30,0.06)"
            vertical={false}
          />
          <XAxis
            dataKey="week_start"
            tickFormatter={formatWeekShort}
            tick={{ fontSize: 11, fill: "var(--color-on-surface-variant)" }}
            axisLine={{ stroke: "rgba(20,20,30,0.06)" }}
            tickLine={false}
            interval={0}
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
            cursor={{ fill: "rgba(72,139,214,0.08)" }}
            labelFormatter={(label) => `Week of ${formatWeekRange(String(label))}`}
          />
          <Legend
            wrapperStyle={{ fontSize: 11, paddingTop: 4 }}
            iconType="circle"
            iconSize={8}
          />
          <Bar
            dataKey="auto"
            stackId="esc"
            fill="var(--color-page-accent)"
            name="Auto"
            radius={[0, 0, 0, 0]}
          />
          <Bar
            dataKey="user"
            stackId="esc"
            fill="#f59e0b"
            name="User"
            radius={[4, 4, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}
