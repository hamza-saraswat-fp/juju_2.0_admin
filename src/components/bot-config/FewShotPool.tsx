import { Plus } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { FewShotExample } from "@/types/botConfig";
import { formatCategory } from "@/lib/utils";
import { toast } from "sonner";

interface FewShotPoolProps {
  examples: FewShotExample[];
  onDemote: (exampleId: string) => void;
}

export function FewShotPool({ examples, onDemote }: FewShotPoolProps) {
  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">
            Few-shot Pool ({examples.length} examples)
          </h2>
          <p className="text-sm text-muted-foreground">
            Promoted responses used as ground-truth context for few-shot
            learning optimization.
          </p>
        </div>
        <Button
          size="sm"
          className="gap-1.5 bg-primary-navy hover:bg-primary-navy/90"
          onClick={() => toast("Add Example — coming soon")}
        >
          <Plus className="h-3.5 w-3.5" />
          Add Example
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {examples.map((ex) => (
          <Card key={ex.id}>
            <CardContent className="p-4">
              <div className="mb-2 flex items-center justify-between">
                <Badge
                  variant="outline"
                  className={
                    ex.source === "high_confidence"
                      ? "border-blue-300 text-blue-700 text-[10px]"
                      : "border-green-300 text-green-700 text-[10px]"
                  }
                >
                  {ex.source === "high_confidence"
                    ? "HIGH CONFIDENCE"
                    : "GROUND TRUTH"}
                </Badge>
                <Badge variant="outline" className="text-[10px]">
                  {formatCategory(ex.category)}
                </Badge>
              </div>

              <p className="text-[0.6875rem] font-semibold uppercase tracking-widest text-muted-foreground">
                Question
              </p>
              <p className="mt-0.5 line-clamp-2 text-sm font-medium">
                {ex.questionText}
              </p>

              <p className="mt-3 text-[0.6875rem] font-semibold uppercase tracking-widest text-muted-foreground">
                Promoted Answer
              </p>
              <p className="mt-0.5 line-clamp-3 text-sm text-muted-foreground">
                {ex.promotedAnswer}
              </p>

              <div className="mt-3 flex justify-end gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-[10px] font-semibold uppercase tracking-wider text-red-600 hover:text-red-700"
                  onClick={() => {
                    onDemote(ex.id);
                    toast.success("Example demoted from pool");
                  }}
                >
                  Demote
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-[10px] font-semibold uppercase tracking-wider"
                  onClick={() => toast("Edit — coming soon")}
                >
                  Edit
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
