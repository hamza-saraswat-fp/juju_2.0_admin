import { useEffect } from "react";
import { toast } from "sonner";
import { useBotConfig } from "@/hooks/useBotConfig";
import { PromptSlotCard } from "@/components/bot-config/PromptSlotCard";
import { ConfigSidebar } from "@/components/bot-config/ConfigSidebar";
import { ErrorLog } from "@/components/bot-config/ErrorLog";
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
    addEvalCriterion,
  } = useBotConfig();

  useEffect(() => {
    if (error) toast.error(error);
  }, [error]);

  return (
    <div>
      {/* Page header */}
      <div className="mb-8">
        <p className="text-[0.6875rem] font-semibold uppercase tracking-widest text-primary-blue">
          System Configuration
        </p>
        <h1 className="text-3xl font-semibold tracking-tight">Prompt Slots</h1>
        <p className="mt-1 text-muted-foreground">
          Configure the core logic for each Model Context Protocol (MCP) slot.
          Changes take effect across all active instances upon version save.
        </p>
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
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
            {isLoading
              ? Array.from({ length: 4 }).map((_, i) => (
                  <Card key={i} className="h-[360px] animate-pulse bg-muted/40" />
                ))
              : slots.map((slot) => (
                  <PromptSlotCard
                    key={slot.id}
                    slot={slot}
                    onUpdatePrompt={updatePrompt}
                    onSwitchModel={switchModel}
                    onSaveVersion={saveVersion}
                    onRollback={rollbackToVersion}
                  />
                ))}
          </div>

          {/* Error Log */}
          <ErrorLog entries={errorLog} slots={slots} />
        </div>
      </div>
    </div>
  );
}
