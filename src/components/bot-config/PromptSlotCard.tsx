import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { PromptSlot } from "@/types/botConfig";
import { cn, relativeTime } from "@/lib/utils";

interface PromptSlotCardProps {
  slot: PromptSlot;
  onClick: (slotId: string) => void;
}

export function PromptSlotCard({ slot, onClick }: PromptSlotCardProps) {
  const activeVersion = slot.versions.find(
    (v) => v.id === slot.activeVersionId,
  );
  const hasUnsavedChanges =
    activeVersion && slot.currentPrompt !== activeVersion.prompt;

  const envBadge = {
    production: "bg-green-100 text-green-700 border-green-300",
    staging: "bg-amber-100 text-amber-700 border-amber-300",
    base: "bg-gray-100 text-gray-700 border-gray-300",
  }[slot.environment];

  return (
    <Card
      className="cursor-pointer transition-shadow hover:shadow-md"
      onClick={() => onClick(slot.id)}
    >
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-heading text-base font-medium leading-snug">
            {slot.name}
          </h3>
          <Badge variant="outline" className={cn("text-[10px]", envBadge)}>
            {slot.environment.toUpperCase()}
          </Badge>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <span className="font-mono">{slot.model}</span>
          <span>·</span>
          <Badge variant="outline" className="font-mono text-[10px]">
            {activeVersion?.version ?? "—"}
          </Badge>
          {activeVersion && (
            <>
              <span>·</span>
              <span>Updated {relativeTime(activeVersion.createdAt)}</span>
            </>
          )}
        </div>

        {hasUnsavedChanges && (
          <div className="rounded-md border border-amber-200 bg-amber-50 px-2 py-1 text-[10px] text-amber-800">
            Unsaved draft
          </div>
        )}
      </CardContent>
    </Card>
  );
}
