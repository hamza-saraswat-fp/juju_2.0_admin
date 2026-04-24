import { useCallback, useEffect, useState } from "react";
import { mockEvalCriteria, mockErrorLog } from "@/data/mockBotConfig";
import type {
  PromptSlot,
  EvalCriterion,
  ErrorLogEntry,
} from "@/types/botConfig";
import {
  fetchAllPrompts,
  nextPatchVersion,
  rollbackPrompt,
  saveVersion as saveVersionApi,
} from "@/lib/promptsApi";

/**
 * Single data-access hook for the Bot Config page.
 *
 * Prompts come from Supabase (`prompts` table). Eval criteria and error log
 * remain on mock data for V1.
 */
export function useBotConfig() {
  const [slots, setSlots] = useState<PromptSlot[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [evalCriteria, setEvalCriteria] =
    useState<EvalCriterion[]>(mockEvalCriteria);
  const [errorLog] = useState<ErrorLogEntry[]>(mockErrorLog);

  const refresh = useCallback(async () => {
    try {
      const next = await fetchAllPrompts();
      setSlots(next);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load prompts");
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setIsLoading(true);
      try {
        const next = await fetchAllPrompts();
        if (!cancelled) setSlots(next);
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Failed to load prompts");
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Draft edits — local only until saveVersion.
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

  const saveVersion = useCallback(
    async (slotId: string, description: string) => {
      const slot = slots.find((s) => s.id === slotId);
      if (!slot) return;

      const version = nextPatchVersion(slot.versions.map((v) => v.version));

      try {
        await saveVersionApi({
          slotId,
          version,
          promptText: slot.currentPrompt,
          model: slot.model,
          description,
        });
        await refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to save version");
        throw e;
      }
    },
    [slots, refresh],
  );

  const rollbackToVersion = useCallback(
    async (slotId: string, versionId: string) => {
      try {
        await rollbackPrompt({ slotId, versionId });
        await refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to roll back");
        throw e;
      }
    },
    [refresh],
  );

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

  return {
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
  };
}
