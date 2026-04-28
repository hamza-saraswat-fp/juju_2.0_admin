import { useState } from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

const SLOT_ID_PATTERN = /^[a-z][a-z0-9_]*$/;

interface NewPromptSlotSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  availableModels: string[];
  existingSlotIds: string[];
  onCreate: (params: {
    id: string;
    promptText: string;
    model: string;
    description: string;
  }) => Promise<void>;
}

export function NewPromptSlotSheet({
  open,
  onOpenChange,
  availableModels,
  existingSlotIds,
  onCreate,
}: NewPromptSlotSheetProps) {
  const [slotId, setSlotId] = useState("");
  const [promptText, setPromptText] = useState("");
  const [model, setModel] = useState(availableModels[0] ?? "");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const resetForm = () => {
    setSlotId("");
    setPromptText("");
    setModel(availableModels[0] ?? "");
    setDescription("");
    setSubmitting(false);
  };

  const handleOpenChange = (next: boolean) => {
    if (!next) resetForm();
    onOpenChange(next);
  };

  const trimmedId = slotId.trim();
  const trimmedDesc = description.trim();
  const idValid = SLOT_ID_PATTERN.test(trimmedId);
  const idUnique = !existingSlotIds.includes(trimmedId);
  const canSubmit =
    trimmedId &&
    idValid &&
    idUnique &&
    promptText.trim() &&
    model &&
    trimmedDesc &&
    !submitting;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      await onCreate({
        id: trimmedId,
        promptText,
        model,
        description: trimmedDesc,
      });
      toast.success(`Created slot ${trimmedId}`);
      handleOpenChange(false);
    } catch (e) {
      toast.error(
        e instanceof Error ? e.message : `Failed to create ${trimmedId}`,
      );
      setSubmitting(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent
        side="right"
        className="data-[side=right]:w-full data-[side=right]:sm:max-w-[700px]"
      >
        <SheetHeader className="border-b pb-4">
          <SheetTitle className="text-base">New Prompt Slot</SheetTitle>
        </SheetHeader>

        <div className="flex-1 space-y-4 overflow-y-auto p-6">
          <div>
            <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Slot ID
            </p>
            <Input
              placeholder="failure_detection"
              value={slotId}
              onChange={(e) => setSlotId(e.target.value)}
              className="font-mono text-xs"
              autoFocus
            />
            <p className="mt-1 text-[11px] text-muted-foreground">
              Display name is auto-derived from the slot ID — e.g.{" "}
              <code className="font-mono">help_center_mcp</code> →{" "}
              <span className="italic">Help Center MCP</span>.
            </p>
            {trimmedId && !idValid && (
              <p className="mt-1 text-[11px] text-destructive">
                Use snake_case: lowercase letters, numbers, and underscores
                only. Must start with a letter.
              </p>
            )}
            {trimmedId && idValid && !idUnique && (
              <p className="mt-1 text-[11px] text-destructive">
                A slot with this ID already exists.
              </p>
            )}
          </div>

          <div>
            <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Model
            </p>
            <select
              value={model}
              onChange={(e) => setModel(e.target.value)}
              className="h-8 rounded-md border border-input bg-transparent px-2 text-xs focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring/50"
            >
              {availableModels.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>

          <div>
            <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Initial Prompt (v1.0.0)
            </p>
            <Textarea
              placeholder="Paste the prompt text..."
              value={promptText}
              onChange={(e) => setPromptText(e.target.value)}
              className="min-h-[40vh] font-mono text-xs leading-relaxed"
            />
          </div>

          <div>
            <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Version Description
            </p>
            <Input
              placeholder="What this prompt does"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="text-sm"
            />
          </div>

          <div className="flex items-center gap-2 pt-2">
            <Button
              size="sm"
              className="h-8 gap-1 bg-primary-navy hover:bg-primary-navy/90"
              onClick={handleSubmit}
              disabled={!canSubmit}
            >
              <Plus className="h-3.5 w-3.5" />
              {submitting ? "Creating..." : "Create Slot"}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 text-xs"
              onClick={() => handleOpenChange(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
