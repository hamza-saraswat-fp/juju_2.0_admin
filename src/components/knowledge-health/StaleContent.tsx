import { BookOpen, FolderOpen } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { SourceStats } from "@/types/knowledge";

interface StaleContentProps {
  sources: SourceStats[];
}

export function StaleContent({ sources }: StaleContentProps) {
  const shown = sources.slice(0, 4);

  if (shown.length === 0) {
    return null;
  }

  return (
    <div>
      <p className="mb-4 text-[0.6875rem] font-semibold uppercase tracking-widest text-muted-foreground">
        Stale Content ({"> "}6 Months)
      </p>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {shown.map((s) => (
          <Card key={s.source.id} className="hover:bg-muted/50">
            <CardContent className="flex items-start gap-3 p-4">
              <div className="mt-0.5">
                {s.source.sourceType === "knowledge_center" ? (
                  <span className="inline-flex items-center gap-1 text-blue-600">
                    <BookOpen className="h-4 w-4" />
                    <span className="text-[9px] font-medium">KC</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-amber-600">
                    <FolderOpen className="h-4 w-4" />
                    <span className="text-[9px] font-medium">Conf</span>
                  </span>
                )}
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium">{s.source.title}</p>
                  <Badge variant="destructive" className="ml-2 shrink-0 text-[10px]">
                    STALE: {s.staleDays}D
                  </Badge>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  Owner: {s.source.owner}
                </p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
