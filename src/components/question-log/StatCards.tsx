import { useState } from "react";
import { ArrowDown, ArrowUp, Minus } from "lucide-react";
import { Card } from "@/components/ui/card";
import { TimeToggle } from "@/components/ui/time-toggle";
import {
  useQuestionMetrics,
  type MetricCard as MetricCardData,
  type Trend,
} from "@/hooks/useQuestionMetrics";
import { Sparkline } from "./Sparkline";
import type { TimeRange } from "@/lib/questionFilters";
import { cn } from "@/lib/utils";

export function StatCards() {
  return (
    <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <HeroCard
        title="Avg messages / day"
        select={(m) => m.avgMessages}
        formatPrimary={(v) => v.toFixed(1)}
        delay={1}
      />
      <HeroCard
        title="Auto-resolve rate"
        select={(m) => m.autoResolveRate}
        formatPrimary={(v) => `${(v * 100).toFixed(0)}%`}
        delay={2}
      />
      <HeroCard
        title="Unique users"
        select={(m) => m.uniqueUsers}
        formatPrimary={(v) => v.toLocaleString()}
        delay={3}
      />
      <HeroCard
        title="Open escalations"
        select={(m) => m.openEscalations}
        formatPrimary={(v) => v.toString()}
        delay={4}
        emphasizeWhenPositive
      />
    </div>
  );
}

interface HeroCardProps {
  title: string;
  select: (m: NonNullable<ReturnType<typeof useQuestionMetrics>["metrics"]>) => MetricCardData;
  formatPrimary: (v: number) => string;
  delay?: 1 | 2 | 3 | 4;
  /** Open Escalations gets a rose tint when > 0. */
  emphasizeWhenPositive?: boolean;
}

function HeroCard({
  title,
  select,
  formatPrimary,
  delay,
  emphasizeWhenPositive,
}: HeroCardProps) {
  const [range, setRange] = useState<TimeRange>("7d");
  const { metrics, isLoading } = useQuestionMetrics(range);

  const card = metrics ? select(metrics) : null;
  const positive = (card?.primary ?? 0) > 0;
  const primaryClassName = emphasizeWhenPositive && positive
    ? "text-rose-600"
    : undefined;
  const sparklineClassName = emphasizeWhenPositive && positive
    ? "text-rose-500"
    : "text-page-accent";

  const delayClass = delay
    ? { 1: "fade-d-1", 2: "fade-d-2", 3: "fade-d-3", 4: "fade-d-4" }[delay]
    : undefined;

  if (isLoading || !card) {
    return (
      <Card className={cn("flex flex-col p-5 pb-0", delayClass, "fade-up")}>
        <CardHeader title={title} range={range} onRangeChange={setRange} />
        <div className="mt-3 h-9 w-20 animate-pulse rounded bg-surface-deep" />
        <div className="mb-4 mt-2 h-5 w-16 animate-pulse rounded-full bg-surface-deep" />
        <div className="-mx-5 mt-auto h-10 animate-pulse bg-surface-deep" />
      </Card>
    );
  }

  return (
    <Card className={cn("flex flex-col p-5 pb-0", delayClass, "fade-up")}>
      <CardHeader title={title} range={range} onRangeChange={setRange} />
      <p
        className={cn(
          "mt-3 font-mono text-[2.25rem] font-semibold leading-none tracking-tight",
          primaryClassName,
        )}
      >
        {card.primary !== null ? formatPrimary(card.primary) : "—"}
      </p>
      <div className="mb-4 mt-2">
        <TrendPill trend={card.trend} />
      </div>
      <div className="-mx-5 mt-auto">
        <Sparkline
          data={card.sparkline}
          className={sparklineClassName}
          height={40}
        />
      </div>
    </Card>
  );
}

function CardHeader({
  title,
  range,
  onRangeChange,
}: {
  title: string;
  range: TimeRange;
  onRangeChange: (r: TimeRange) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-2">
      <p className="text-xs font-medium uppercase tracking-wider text-on-surface-variant">
        {title}
      </p>
      <TimeToggle value={range} onChange={onRangeChange} />
    </div>
  );
}

function TrendPill({ trend }: { trend: Trend }) {
  if (trend === null) {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-on-surface-faint">
        <Minus className="h-3 w-3" />
        Not enough data
      </span>
    );
  }

  const direction = trend.value > 0 ? "up" : trend.value < 0 ? "down" : "flat";
  const Icon =
    direction === "up" ? ArrowUp : direction === "down" ? ArrowDown : Minus;
  const isGood =
    direction === "flat" ? null : direction === trend.goodDirection;
  const tone =
    isGood === null
      ? "text-on-surface-variant bg-surface-deep border-line-strong"
      : isGood
        ? "text-emerald-700 bg-emerald-50 border-emerald-200"
        : "text-rose-700 bg-rose-50 border-rose-200";

  const formatted =
    trend.kind === "percent"
      ? `${Math.abs(trend.value).toFixed(1)}%`
      : trend.kind === "pp"
        ? `${Math.abs(trend.value).toFixed(1)} pp`
        : `${Math.abs(trend.value)}`;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium",
        tone,
      )}
    >
      <Icon className="h-3 w-3" />
      {formatted}
    </span>
  );
}

