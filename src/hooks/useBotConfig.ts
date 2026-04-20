import { useState, useCallback } from "react";
import {
  mockPromptSlots,
  mockEvalCriteria,
  mockDataSources,
  mockFewShotExamples,
  mockErrorLog,
} from "@/data/mockBotConfig";
import type {
  PromptSlot,
  EvalCriterion,
  DataSourceConfig,
  FewShotExample,
  ErrorLogEntry,
} from "@/types/botConfig";

/**
 * Single data-access hook for the Bot Config page.
 * Swap point for Supabase: replace mock imports with queries.
 */
export function useBotConfig() {
  const [slots, setSlots] = useState<PromptSlot[]>(mockPromptSlots);
  const [dataSources, setDataSources] =
    useState<DataSourceConfig[]>(mockDataSources);
  const [evalCriteria, setEvalCriteria] =
    useState<EvalCriterion[]>(mockEvalCriteria);
  const [fewShotExamples, setFewShotExamples] =
    useState<FewShotExample[]>(mockFewShotExamples);
  const [errorLog] = useState<ErrorLogEntry[]>(mockErrorLog);

  const updatePrompt = useCallback((slotId: string, prompt: string) => {
    setSlots((prev) =>
      prev.map((s) => (s.id === slotId ? { ...s, currentPrompt: prompt } : s)),
    );
  }, []);

  const switchModel = useCallback((slotId: string, model: string) => {
    setSlots((prev) =>
      prev.map((s) => (s.id === slotId ? { ...s, model } : s)),
    );
  }, []);

  const saveVersion = useCallback((slotId: string, description: string) => {
    setSlots((prev) =>
      prev.map((s) => {
        if (s.id !== slotId) return s;

        // Auto-increment version
        const lastVersion = s.versions[s.versions.length - 1];
        const parts = lastVersion.version.replace("v", "").split(".");
        const newVersion = `v${parts[0]}.${parts[1]}.${Number(parts[2]) + 1}`;

        const newVersionObj = {
          id: `${slotId}-v-${Date.now()}`,
          version: newVersion,
          label: "Current",
          prompt: s.currentPrompt,
          model: s.model,
          createdAt: new Date().toISOString(),
          description,
        };

        // Mark previous versions as non-current
        const updatedVersions = s.versions.map((v) => ({
          ...v,
          label: v.label === "Current" ? "Archived" : v.label,
        }));

        return {
          ...s,
          versions: [...updatedVersions, newVersionObj],
          activeVersionId: newVersionObj.id,
        };
      }),
    );
  }, []);

  const rollbackToVersion = useCallback(
    (slotId: string, versionId: string) => {
      setSlots((prev) =>
        prev.map((s) => {
          if (s.id !== slotId) return s;
          const version = s.versions.find((v) => v.id === versionId);
          if (!version) return s;

          return {
            ...s,
            currentPrompt: version.prompt,
            model: version.model,
            activeVersionId: versionId,
          };
        }),
      );
    },
    [],
  );

  const toggleDataSource = useCallback((sourceId: string) => {
    setDataSources((prev) =>
      prev.map((ds) =>
        ds.id === sourceId ? { ...ds, enabled: !ds.enabled } : ds,
      ),
    );
  }, []);

  const addEvalCriterion = useCallback((name: string) => {
    setEvalCriteria((prev) => [
      ...prev,
      {
        id: `eval-${Date.now()}`,
        name,
        value: 0,
        unit: "percent",
        isActive: true,
      },
    ]);
  }, []);

  const demoteExample = useCallback((exampleId: string) => {
    setFewShotExamples((prev) => prev.filter((e) => e.id !== exampleId));
  }, []);

  return {
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
  };
}
