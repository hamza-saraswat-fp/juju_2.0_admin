import { TrendingUp, TrendingDown } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import type { QuestionStats } from "@/types/question";
import { cn, formatCategory } from "@/lib/utils";

// Note: the `lowConfidenceCount` field on QuestionStats is no longer rendered.
// Confidence was hidden from the UI until we have calibrated scoring — the
// bot still writes answer_confidence so the data keeps flowing for later.

interface StatCardsProps {
  stats: QuestionStats;
}

export function StatCards({ stats }: StatCardsProps) {
  return (
    <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-4">
      {/* Questions Today */}
      <StatCard
        label="Questions Today"
        value={stats.questionsToday.toLocaleString()}
        mono
        // Trend delta is a hardcoded mock value — we don't have historical
        // data yet. This shapes the UI for when Supabase provides real deltas.
        trend={{ value: "+12", direction: "up", label: "vs. yesterday" }}
      />

      {/* 👍 Rate */}
      <StatCard
        label="👍 Rate"
        value={`${stats.thumbsUpRate}%`}
        mono
        valueClassName={cn(
          stats.thumbsUpRate >= 75
            ? "text-green-600"
            : stats.thumbsUpRate >= 40
              ? "text-amber-600"
              : "text-red-600",
        )}
        trend={{ value: "+3%", direction: "up", label: "vs. last week" }}
      />

      {/* Unanswered */}
      <StatCard
        label="Unanswered"
        value={stats.unansweredCount.toString()}
        mono
        valueClassName={stats.unansweredCount > 0 ? "text-amber-600" : ""}
      />

      {/* Top Category */}
      <StatCard
        label="Top Category"
        value={formatCategory(stats.topCategory.category)}
        subtitle={`${stats.topCategory.count} questions`}
      />
    </div>
  );
}

// ── Helpers ──────────────────────────────────────────────────

interface Trend {
  value: string;
  direction: "up" | "down";
  label: string;
}

function StatCard({
  label,
  value,
  subtitle,
  mono,
  valueClassName,
  trend,
}: {
  label: string;
  value: string;
  subtitle?: string;
  mono?: boolean;
  valueClassName?: string;
  trend?: Trend;
}) {
  return (
    <Card>
      <CardContent className="p-6">
        <p className="mb-1 text-[0.6875rem] font-semibold uppercase tracking-widest text-muted-foreground">
          {label}
        </p>
        <p
          className={cn(
            "text-3xl font-semibold",
            mono && "font-mono",
            valueClassName,
          )}
        >
          {value}
        </p>
        {subtitle && (
          <p className="mt-1 text-xs text-muted-foreground">{subtitle}</p>
        )}
        {trend && (
          <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
            {trend.direction === "up" ? (
              <TrendingUp className="h-3 w-3 text-green-500" />
            ) : (
              <TrendingDown className="h-3 w-3 text-red-500" />
            )}
            <span
              className={
                trend.direction === "up" ? "text-green-600" : "text-red-600"
              }
            >
              {trend.value}
            </span>
            <span>{trend.label}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

