import { useBotConfig } from "@/hooks/useBotConfig";
import { PromptSlotCard } from "@/components/bot-config/PromptSlotCard";
import { ConfigSidebar } from "@/components/bot-config/ConfigSidebar";
import { FewShotPool } from "@/components/bot-config/FewShotPool";
import { ErrorLog } from "@/components/bot-config/ErrorLog";

export function BotConfig() {
  const {
    slots,
    dataSources,
    evalCriteria,
    fewShotExamples,
    errorLog,
    updatePrompt,
    switchModel,
    saveVersion,
    rollbackToVersion,
    toggleDataSource,
    addEvalCriterion,
    demoteExample,
  } = useBotConfig();

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
        {/* Sidebar */}
        <div className="shrink-0 lg:w-[250px]">
          <ConfigSidebar
            dataSources={dataSources}
            evalCriteria={evalCriteria}
            onToggleSource={toggleDataSource}
            onAddCriterion={addEvalCriterion}
          />
        </div>

        {/* Main content */}
        <div className="flex-1 space-y-8">
          {/* Prompt Slot Cards */}
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
            {slots.map((slot) => (
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

          {/* Few-shot Pool */}
          <FewShotPool
            examples={fewShotExamples}
            onDemote={demoteExample}
          />

          {/* Error Log */}
          <ErrorLog entries={errorLog} slots={slots} />
        </div>
      </div>
    </div>
  );
}
