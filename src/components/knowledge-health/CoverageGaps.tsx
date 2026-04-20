import { Send } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { CoverageGap } from "@/types/knowledge";
import { cn, formatCategory } from "@/lib/utils";
import { toast } from "sonner";

interface CoverageGapsProps {
  gaps: CoverageGap[];
}

export function CoverageGaps({ gaps }: CoverageGapsProps) {
  if (gaps.length === 0) return null;

  return (
    <div>
      <p className="mb-4 text-[0.6875rem] font-semibold uppercase tracking-widest text-muted-foreground">
        Coverage Gaps by Category
      </p>
      <div className="space-y-4">
        {gaps.map((gap) => (
          <Card key={gap.id}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="font-medium">
                    {formatCategory(gap.category)}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {gap.description}
                  </p>
                  {/* Unanswered rate bar */}
                  <div className="mt-3 flex items-center gap-3">
                    <div className="h-2 w-24 overflow-hidden rounded-full bg-gray-200">
                      <div
                        className={cn(
                          "h-full rounded-full",
                          gap.unansweredRate >= 30
                            ? "bg-red-500"
                            : gap.unansweredRate >= 20
                              ? "bg-amber-500"
                              : "bg-green-500",
                        )}
                        style={{ width: `${gap.unansweredRate}%` }}
                      />
                    </div>
                    <span
                      className={cn(
                        "font-mono text-sm font-semibold",
                        gap.unansweredRate >= 30
                          ? "text-red-600"
                          : "text-amber-600",
                      )}
                    >
                      {gap.unansweredRate}% Unanswered
                    </span>
                  </div>
                </div>
                <Button
                  variant="default"
                  size="sm"
                  className="ml-4 shrink-0 gap-1.5 bg-primary-navy hover:bg-primary-navy/90"
                  onClick={() =>
                    toast.success(
                      `Notification sent to ${gap.owner}`,
                    )
                  }
                >
                  <Send className="h-3.5 w-3.5" />
                  Ping Owner
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
