import { useNavigate } from "react-router-dom";
import { Maximize2 } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PromptSlotEditor } from "./PromptSlotEditor";
import type { PromptSlot } from "@/types/botConfig";
import { cn } from "@/lib/utils";

interface PromptSlotDrawerProps {
  slot: PromptSlot | null;
  open: boolean;
  onClose: () => void;
  onUpdatePrompt: (slotId: string, prompt: string) => void;
  onSwitchModel: (slotId: string, model: string) => void;
  onSaveVersion: (slotId: string, description: string) => Promise<void> | void;
  onRollback: (slotId: string, versionId: string) => Promise<void> | void;
}

export function PromptSlotDrawer({
  slot,
  open,
  onClose,
  onUpdatePrompt,
  onSwitchModel,
  onSaveVersion,
  onRollback,
}: PromptSlotDrawerProps) {
  const navigate = useNavigate();

  const envBadge = slot
    ? {
        production: "bg-green-100 text-green-700 border-green-300",
        staging: "bg-amber-100 text-amber-700 border-amber-300",
        base: "bg-gray-100 text-gray-700 border-gray-300",
      }[slot.environment]
    : "";

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent
        side="right"
        className="data-[side=right]:w-full data-[side=right]:sm:max-w-[900px]"
      >
        {slot && (
          <>
            <SheetHeader className="flex flex-row items-center justify-between border-b pb-4">
              <div className="flex items-center gap-3">
                <SheetTitle className="text-base">{slot.name}</SheetTitle>
                <Badge
                  variant="outline"
                  className={cn("text-[10px]", envBadge)}
                >
                  {slot.environment.toUpperCase()}
                </Badge>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="mr-8 gap-1.5 text-xs"
                onClick={() => {
                  onClose();
                  navigate(`/config/${slot.id}`);
                }}
              >
                <Maximize2 className="h-3.5 w-3.5" />
                Expand
              </Button>
            </SheetHeader>
            <div className="flex-1 overflow-y-auto p-6">
              <PromptSlotEditor
                slot={slot}
                variant="drawer"
                onUpdatePrompt={onUpdatePrompt}
                onSwitchModel={onSwitchModel}
                onSaveVersion={onSaveVersion}
                onRollback={onRollback}
              />
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
