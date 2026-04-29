import { useState } from "react";
import {
  Bar,
  BarChart,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ChartCard } from "./ChartCard";
import { useQuestionPhase2 } from "@/hooks/useQuestionPhase2";
import { CATEGORY_LABELS } from "@/config/jujuTaxonomy";
import type { Category } from "@/types/question";
import type { QuestionFilters, TimeRange } from "@/lib/questionFilters";

interface Props {
  filters: QuestionFilters;
}

function categoryLabel(raw: string): string {
  return CATEGORY_LABELS[raw as Category] ?? raw;
}

export function EscalationRateByCategory({ filters }: Props) {
  const [range, setRange] = useState<TimeRange>("7d");
  const { data, isLoading } = useQuestionPhase2({
    ...filters,
    timeRange: range,
  });
  const rows = data?.escalation_rate_by_category ?? [];
  const empty = !isLoading && rows.length === 0;
  const display = rows.map((d) => ({
    ...d,
    label: categoryLabel(d.category),
    pct: Math.round(d.rate * 100),
  }));

  return (
    <ChartCard
      title="Escalation rate by category"
      subtitle="Top 8 · min 5 questions"
      range={range}
      onRangeChange={setRange}
      isLoading={isLoading}
      isEmpty={empty}
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={display}
          layout="vertical"
          margin={{ top: 0, right: 44, left: 0, bottom: 0 }}
        >
          <XAxis type="number" hide allowDecimals={false} domain={[0, 100]} />
          <YAxis
            type="category"
            dataKey="label"
            tick={{ fontSize: 11, fill: "var(--color-on-surface-variant)" }}
            axisLine={false}
            tickLine={false}
            width={120}
          />
          <Tooltip
            contentStyle={{
              borderRadius: 12,
              border: "1px solid rgba(20,20,30,0.10)",
              boxShadow: "0 8px 24px -12px rgba(15,15,40,0.18)",
              fontSize: 12,
            }}
            cursor={{ fill: "rgba(225,29,72,0.08)" }}
            formatter={(_value, _name, item) => {
              const payload = item?.payload as
                | { pct?: number; total?: number }
                | undefined;
              const pct = payload?.pct ?? 0;
              const total = payload?.total ?? 0;
              return [`${pct}% (${total} questions)`, "Escalation rate"];
            }}
          />
          <Bar dataKey="pct" fill="#e11d48" radius={[0, 6, 6, 0]}>
            <LabelList
              dataKey="pct"
              position="right"
              formatter={(v) => `${v}%`}
              style={{
                fontSize: 11,
                fill: "var(--color-on-surface)",
                fontWeight: 500,
              }}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}
