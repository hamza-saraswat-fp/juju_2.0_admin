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

export function TopCategories({ filters }: Props) {
  const [range, setRange] = useState<TimeRange>("7d");
  const { data, isLoading } = useQuestionPhase2({
    ...filters,
    timeRange: range,
  });
  const cats = data?.top_categories ?? [];
  const empty = !isLoading && cats.length === 0;
  const display = cats.map((d) => ({
    ...d,
    label: categoryLabel(d.category),
  }));

  return (
    <ChartCard
      title="Top categories asked"
      subtitle="By volume"
      range={range}
      onRangeChange={setRange}
      isLoading={isLoading}
      isEmpty={empty}
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={display}
          layout="vertical"
          margin={{ top: 0, right: 36, left: 0, bottom: 0 }}
        >
          <XAxis type="number" hide allowDecimals={false} />
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
            cursor={{ fill: "rgba(72,139,214,0.08)" }}
            formatter={(value) => [value, "Questions"]}
          />
          <Bar
            dataKey="count"
            fill="var(--color-page-accent)"
            radius={[0, 6, 6, 0]}
          >
            <LabelList
              dataKey="count"
              position="right"
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
