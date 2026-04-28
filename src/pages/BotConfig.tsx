import { useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { useBotConfig } from "@/hooks/useBotConfig";
import { AVAILABLE_MODELS } from "@/lib/promptsApi";
import { PromptSlotCard } from "@/components/bot-config/PromptSlotCard";
import { PromptSlotDrawer } from "@/components/bot-config/PromptSlotDrawer";
import { NewPromptSlotSheet } from "@/components/bot-config/NewPromptSlotSheet";
import { ConfigSidebar } from "@/components/bot-config/ConfigSidebar";
import { ErrorLog } from "@/components/bot-config/ErrorLog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export function BotConfig() {
  const {
    slots,
    isLoading,
    error,
    evalCriteria,
    errorLog,
    updatePrompt,
    switchModel,
    saveVersion,
    rollbackToVersion,
    createSlot,
    addEvalCriterion,
  } = useBotConfig();

  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null);
  const [newSheetOpen, setNewSheetOpen] = useState(false);
  const selectedSlot = selectedSlotId
    ? (slots.find((s) => s.id === selectedSlotId) ?? null)
    : null;

  const availableModels = AVAILABLE_MODELS;

  useEffect(() => {
    if (error) toast.error(error);
  }, [error]);

  return (
    <div>
      {/* Page header */}
      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <p className="text-[0.6875rem] font-semibold uppercase tracking-widest text-primary-blue">
            System Configuration
          </p>
          <h1 className="text-3xl font-semibold tracking-tight">Prompt Slots</h1>
          <p className="mt-1 text-muted-foreground">
            Click a slot to edit its prompt. Changes take effect across all
            active instances upon version save.
          </p>
        </div>
        <Button
          size="sm"
          className="gap-1.5 bg-primary-navy hover:bg-primary-navy/90"
          onClick={() => setNewSheetOpen(true)}
        >
          <Plus className="h-3.5 w-3.5" />
          New Prompt
        </Button>
      </div>

      <div className="flex flex-col gap-6 lg:flex-row">
        {/* Sidebar — evals only */}
        <div className="shrink-0 lg:w-[250px]">
          <ConfigSidebar
            evalCriteria={evalCriteria}
            onAddCriterion={addEvalCriterion}
          />
        </div>

        {/* Main content */}
        <div className="flex-1 space-y-8">
          {/* Prompt Slot Cards */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {isLoading
              ? Array.from({ length: 5 }).map((_, i) => (
                  <Card key={i} className="h-[140px] animate-pulse bg-muted/40" />
                ))
              : slots.map((slot) => (
                  <PromptSlotCard
                    key={slot.id}
                    slot={slot}
                    onClick={setSelectedSlotId}
                  />
                ))}
          </div>

          {/* Error Log */}
          <ErrorLog entries={errorLog} slots={slots} />
        </div>
      </div>

      <PromptSlotDrawer
        slot={selectedSlot}
        open={selectedSlot !== null}
        onClose={() => setSelectedSlotId(null)}
        onUpdatePrompt={updatePrompt}
        onSwitchModel={switchModel}
        onSaveVersion={saveVersion}
        onRollback={rollbackToVersion}
      />

      <NewPromptSlotSheet
        open={newSheetOpen}
        onOpenChange={setNewSheetOpen}
        availableModels={availableModels}
        existingSlotIds={slots.map((s) => s.id)}
        onCreate={createSlot}
      />
    </div>
  );
}
