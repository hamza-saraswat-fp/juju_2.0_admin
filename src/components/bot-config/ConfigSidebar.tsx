import { useState } from "react";
import { Plus } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import type { EvalCriterion } from "@/types/botConfig";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface ConfigSidebarProps {
  evalCriteria: EvalCriterion[];
  onAddCriterion: (name: string) => void;
}

export function ConfigSidebar({
  evalCriteria,
  onAddCriterion,
}: ConfigSidebarProps) {
  const [addMode, setAddMode] = useState(false);
  const [newCriterionName, setNewCriterionName] = useState("");

  const handleAdd = () => {
    if (!newCriterionName.trim()) return;
    onAddCriterion(newCriterionName.trim());
    setNewCriterionName("");
    setAddMode(false);
    toast.success(
      `Criterion "${newCriterionName.trim()}" added (forward-only)`,
    );
  };

  return (
    <Card>
      <CardContent className="p-4">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-[0.6875rem] font-semibold uppercase tracking-widest text-muted-foreground">
            Active Evals
          </p>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 gap-1 px-2 text-[10px] font-semibold uppercase tracking-wider text-primary-blue"
            onClick={() => setAddMode(true)}
          >
            <Plus className="h-3 w-3" />
            Add Criterion
          </Button>
        </div>

        <div className="space-y-3">
          {evalCriteria.map((ec) => (
            <div key={ec.id}>
              <div className="flex items-center justify-between">
                <span className="text-sm">{ec.name}</span>
                <span className="font-mono text-sm font-semibold text-primary-blue">
                  {ec.unit === "percent" ? `${ec.value}%` : `${ec.value}s`}
                </span>
              </div>
              <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-gray-200">
                <div
                  className={cn(
                    "h-full rounded-full",
                    ec.unit === "percent"
                      ? ec.value >= 85
                        ? "bg-green-500"
                        : ec.value >= 60
                          ? "bg-amber-500"
                          : "bg-red-500"
                      : "bg-primary-blue",
                  )}
                  style={{
                    width:
                      ec.unit === "percent"
                        ? `${ec.value}%`
                        : `${Math.min((ec.value / 5) * 100, 100)}%`,
                  }}
                />
              </div>
            </div>
          ))}
        </div>

        {addMode && (
          <>
            <Separator className="my-3" />
            <div className="flex items-center gap-2">
              <Input
                placeholder="Criterion name..."
                value={newCriterionName}
                onChange={(e) => setNewCriterionName(e.target.value)}
                className="h-7 text-xs"
                onKeyDown={(e) => e.key === "Enter" && handleAdd()}
                autoFocus
              />
              <Button
                size="sm"
                className="h-7 bg-primary-navy text-xs hover:bg-primary-navy/90"
                onClick={handleAdd}
              >
                Add
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs"
                onClick={() => setAddMode(false)}
              >
                Cancel
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
