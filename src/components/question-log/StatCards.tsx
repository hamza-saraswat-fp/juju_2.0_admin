import { Card, CardContent } from "@/components/ui/card";
import type { QuestionStats } from "@/types/question";
import { ratingMeta } from "@/config/ratingScale";
import { cn } from "@/lib/utils";

interface StatCardsProps {
  stats: QuestionStats;
}

export function StatCards({ stats }: StatCardsProps) {
  const avgEmoji = stats.avgRatingToday !== null
    ? ratingMeta(stats.avgRatingToday).emoji
    : null;
  const avgTone = stats.avgRatingToday !== null
    ? ratingMeta(stats.avgRatingToday).toneClass
    : "";

  return (
    <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-4">
      <StatCard
        label="Questions today"
        value={stats.questionsToday.toLocaleString()}
        mono
      />

      <StatCard
        label="Avg rating today"
        value={
          stats.avgRatingToday !== null
            ? `${avgEmoji} ${stats.avgRatingToday.toFixed(1)}`
            : "—"
        }
        valueClassName={avgTone}
        subtitle={
          stats.ratingCountToday > 0
            ? `${stats.ratingCountToday} rating${stats.ratingCountToday === 1 ? "" : "s"}`
            : "No ratings yet"
        }
      />

      <StatCard
        label="Escalated today"
        value={stats.escalatedToday.toString()}
        mono
        valueClassName={stats.escalatedToday > 0 ? "text-amber-600" : ""}
        subtitle={
          stats.escalatedToday > 0
            ? `🚨 Auto ${stats.escalatedTodayAuto} · By user ${stats.escalatedTodayUser}`
            : "None"
        }
      />

      <StatCard
        label="Top sub-category"
        value={stats.topSubCategory?.label ?? "—"}
        subtitle={
          stats.topSubCategory
            ? `${stats.topSubCategory.count} question${stats.topSubCategory.count === 1 ? "" : "s"}`
            : "No sub-categories yet today"
        }
      />
    </div>
  );
}

function StatCard({
  label,
  value,
  subtitle,
  mono,
  valueClassName,
}: {
  label: string;
  value: string;
  subtitle?: string;
  mono?: boolean;
  valueClassName?: string;
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
      </CardContent>
    </Card>
  );
}
