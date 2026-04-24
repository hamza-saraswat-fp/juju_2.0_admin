import { useState } from "react";
import { History, Save, RotateCcw, ChevronDown, ChevronUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import type { PromptSlot } from "@/types/botConfig";
import { cn, relativeTime } from "@/lib/utils";
import { toast } from "sonner";

interface PromptSlotCardProps {
  slot: PromptSlot;
  onUpdatePrompt: (slotId: string, prompt: string) => void;
  onSwitchModel: (slotId: string, model: string) => void;
  onSaveVersion: (slotId: string, description: string) => Promise<void> | void;
  onRollback: (slotId: string, versionId: string) => Promise<void> | void;
}

export function PromptSlotCard({
  slot,
  onUpdatePrompt,
  onSwitchModel,
  onSaveVersion,
  onRollback,
}: PromptSlotCardProps) {
  const [showHistory, setShowHistory] = useState(false);
  const [saveMode, setSaveMode] = useState(false);
  const [saveDescription, setSaveDescription] = useState("");

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

  const handleSave = async () => {
    if (!saveDescription.trim()) return;
    try {
      await onSaveVersion(slot.id, saveDescription.trim());
      setSaveDescription("");
      setSaveMode(false);
      toast.success(`Version saved for ${slot.name}`);
    } catch (e) {
      toast.error(
        e instanceof Error ? e.message : `Failed to save ${slot.name}`,
      );
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">{slot.name}</CardTitle>
          <Badge variant="outline" className={cn("text-[10px]", envBadge)}>
            {slot.environment.toUpperCase()}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* System Instructions */}
        <div>
          <p className="mb-1 text-[0.6875rem] font-semibold uppercase tracking-widest text-muted-foreground">
            System Instructions
          </p>
          <Textarea
            value={slot.currentPrompt}
            onChange={(e) => onUpdatePrompt(slot.id, e.target.value)}
            className="min-h-[200px] font-mono text-xs leading-relaxed"
          />
        </div>

        {/* Unsaved changes banner */}
        {hasUnsavedChanges && (
          <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
            Unsaved changes — save a new version to persist.
          </div>
        )}

        {/* Model + Version */}
        <div className="flex items-center gap-4">
          <div>
            <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Model
            </p>
            <select
              value={slot.model}
              onChange={(e) => onSwitchModel(slot.id, e.target.value)}
              className="h-8 rounded-md border border-input bg-transparent px-2 text-xs focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring/50"
            >
              {slot.availableModels.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>
          <div>
            <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Version
            </p>
            <Badge variant="outline" className="font-mono text-xs">
              {activeVersion?.version ?? "—"}{" "}
              ({activeVersion?.label ?? "Unknown"})
            </Badge>
          </div>
        </div>

        {/* Save + History buttons */}
        <div className="flex items-center gap-2">
          {saveMode ? (
            <div className="flex flex-1 items-center gap-2">
              <Input
                placeholder="Version description..."
                value={saveDescription}
                onChange={(e) => setSaveDescription(e.target.value)}
                className="h-8 text-xs"
                onKeyDown={(e) => e.key === "Enter" && handleSave()}
                autoFocus
              />
              <Button size="sm" className="h-8 gap-1 bg-primary-navy hover:bg-primary-navy/90" onClick={handleSave}>
                <Save className="h-3.5 w-3.5" />
                Save
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 text-xs"
                onClick={() => setSaveMode(false)}
              >
                Cancel
              </Button>
            </div>
          ) : (
            <>
              <Button
                size="sm"
                className="h-8 gap-1 bg-primary-navy hover:bg-primary-navy/90"
                onClick={() => setSaveMode(true)}
              >
                <Save className="h-3.5 w-3.5" />
                Save New Version
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-8"
                onClick={() => setShowHistory(!showHistory)}
              >
                <History className="h-3.5 w-3.5" />
                {showHistory ? (
                  <ChevronUp className="h-3 w-3" />
                ) : (
                  <ChevronDown className="h-3 w-3" />
                )}
              </Button>
            </>
          )}
        </div>

        {/* Version History */}
        {showHistory && (
          <>
            <Separator />
            <div className="max-h-[200px] space-y-2 overflow-y-auto">
              {[...slot.versions].reverse().map((v) => (
                <div
                  key={v.id}
                  className="flex items-center justify-between rounded-md border px-3 py-2"
                >
                  <div>
                    <span className="font-mono text-xs font-medium">
                      {v.version}
                    </span>
                    <Badge
                      variant="outline"
                      className={cn(
                        "ml-2 text-[9px]",
                        v.label === "Current" &&
                          "bg-green-50 text-green-700 border-green-200",
                      )}
                    >
                      {v.label}
                    </Badge>
                    <span className="ml-2 text-[10px] text-muted-foreground">
                      {relativeTime(v.createdAt)}
                    </span>
                  </div>
                  {v.id !== slot.activeVersionId && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-6 gap-1 px-2 text-[10px]"
                      onClick={async () => {
                        try {
                          await onRollback(slot.id, v.id);
                          toast.success(`Rolled back to ${v.version}`);
                        } catch (e) {
                          toast.error(
                            e instanceof Error
                              ? e.message
                              : `Failed to roll back ${slot.name}`,
                          );
                        }
                      }}
                    >
                      <RotateCcw className="h-3 w-3" />
                      Rollback
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
