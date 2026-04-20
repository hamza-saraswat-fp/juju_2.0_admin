import { AlertTriangle, Info } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import type { KnowledgeHealthStats } from "@/types/knowledge";
import { cn } from "@/lib/utils";

interface HealthStatCardsProps {
  stats: KnowledgeHealthStats;
}

export function HealthStatCards({ stats }: HealthStatCardsProps) {
  return (
    <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
      {/* Health Alerts */}
      <Card>
        <CardContent className="p-6">
          <p className="mb-3 text-[0.6875rem] font-semibold uppercase tracking-widest text-muted-foreground">
            Health Alerts
          </p>
          {stats.alerts.length > 0 ? (
            <div className="space-y-2">
              {stats.alerts.map((alert) => (
                <div
                  key={alert.id}
                  className={cn(
                    "rounded-md px-3 py-2 text-sm",
                    alert.type === "warning"
                      ? "bg-amber-50 text-amber-800"
                      : "bg-blue-50 text-blue-800",
                  )}
                >
                  <div className="flex items-center gap-2">
                    {alert.type === "warning" ? (
                      <AlertTriangle className="h-4 w-4 shrink-0" />
                    ) : (
                      <Info className="h-4 w-4 shrink-0" />
                    )}
                    <span className="font-semibold">{alert.label}</span>
                  </div>
                  <p className="mt-0.5 pl-6 text-xs opacity-80">
                    {alert.description}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              No alerts — all sources healthy.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Avg Helpful Rate */}
      <Card>
        <CardContent className="p-6">
          <p className="mb-1 text-[0.6875rem] font-semibold uppercase tracking-widest text-muted-foreground">
            Avg. Helpful Rate
          </p>
          <p
            className={cn(
              "font-mono text-3xl font-semibold",
              stats.avgHelpfulRate >= 75
                ? "text-green-600"
                : stats.avgHelpfulRate >= 50
                  ? "text-amber-600"
                  : "text-red-600",
            )}
          >
            {stats.avgHelpfulRate}%
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Across {stats.totalCitations.toLocaleString()} total citations
          </p>
        </CardContent>
      </Card>

      {/* Coverage Gaps — navy accent card */}
      <Card className="border-0 bg-primary-navy text-white">
        <CardContent className="p-6">
          <p className="mb-1 text-[0.6875rem] font-semibold uppercase tracking-widest text-blue-300">
            Coverage Gaps
          </p>
          <p
            className={cn(
              "font-mono text-3xl font-semibold",
              stats.coverageGapCount > 0 ? "text-red-300" : "text-white",
            )}
          >
            {stats.coverageGapCount}
          </p>
          <p className="mt-1 text-xs text-blue-200">
            Categories need attention
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
