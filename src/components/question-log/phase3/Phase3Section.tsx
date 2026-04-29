import { useState } from "react";
import { BarChart3, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsiblePanel,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import type { QuestionFilters } from "@/lib/questionFilters";
import { cn } from "@/lib/utils";
import { AutoResolveWeekly } from "./AutoResolveWeekly";
import { UsageHeatmap } from "./UsageHeatmap";

interface Props {
  filters: QuestionFilters;
}

/**
 * Tier 3, opt-in. Collapsed by default; data only fetched when expanded.
 * The trigger is a solid accent-colored CTA button (vs. the prior dashed
 * dim trigger), and each chart inside owns its own time-range toggle.
 */
export function Phase3Section({ filters }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <div className="mb-8">
      <Collapsible open={open} onOpenChange={setOpen}>
        <div className="flex justify-center">
          <CollapsibleTrigger
            render={
              <Button
                variant="default"
                size="lg"
                className="bg-page-accent px-5 text-white hover:bg-page-accent-deep"
              >
                <BarChart3 className="h-4 w-4" />
                {open ? "Hide" : "Show"} usage patterns
                <ChevronDown
                  className={cn(
                    "ml-1 h-4 w-4 transition-transform",
                    !open && "-rotate-90",
                  )}
                />
              </Button>
            }
          />
        </div>
        <CollapsiblePanel>
          <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
            <UsageHeatmap filters={filters} enabled={open} />
            <AutoResolveWeekly filters={filters} enabled={open} />
          </div>
        </CollapsiblePanel>
      </Collapsible>
    </div>
  );
}
