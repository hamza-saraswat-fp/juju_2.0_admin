import { supabase } from "@/lib/supabase";
import { PROMPT_SLOTS_META } from "@/config/promptSlots";
import type { PromptSlot, PromptVersion } from "@/types/botConfig";

interface PromptRow {
  id: string;
  slot_id: string;
  version: string;
  prompt_text: string;
  model: string;
  description: string;
  is_active: boolean;
  created_at: string;
}

function rowToVersion(row: PromptRow): PromptVersion {
  return {
    id: row.id,
    version: row.version,
    label: row.is_active ? "Current" : "Archived",
    prompt: row.prompt_text,
    model: row.model,
    createdAt: row.created_at,
    description: row.description,
  };
}

export async function fetchAllPrompts(): Promise<PromptSlot[]> {
  const { data, error } = await supabase
    .from("prompts")
    .select("*")
    .order("created_at", { ascending: true });

  if (error) throw new Error(error.message);

  const rows = (data ?? []) as PromptRow[];
  const bySlot = new Map<string, PromptRow[]>();
  for (const row of rows) {
    const list = bySlot.get(row.slot_id) ?? [];
    list.push(row);
    bySlot.set(row.slot_id, list);
  }

  return PROMPT_SLOTS_META.map((meta) => {
    const slotRows = bySlot.get(meta.id) ?? [];
    const versions = slotRows.map(rowToVersion);
    const activeRow = slotRows.find((r) => r.is_active);
    return {
      ...meta,
      currentPrompt: activeRow?.prompt_text ?? "",
      model: activeRow?.model ?? meta.availableModels[0],
      versions,
      activeVersionId: activeRow?.id ?? "",
    };
  });
}

export async function fetchSlotVersions(slotId: string): Promise<PromptRow[]> {
  const { data, error } = await supabase
    .from("prompts")
    .select("*")
    .eq("slot_id", slotId)
    .order("created_at", { ascending: true });

  if (error) throw new Error(error.message);
  return (data ?? []) as PromptRow[];
}

export function nextPatchVersion(existing: string[]): string {
  if (existing.length === 0) return "v1.0.0";
  const parsed = existing
    .map((v) => v.replace(/^v/, "").split(".").map(Number))
    .filter((parts) => parts.length === 3 && parts.every((n) => !Number.isNaN(n)));

  if (parsed.length === 0) return "v1.0.0";

  parsed.sort((a, b) => a[0] - b[0] || a[1] - b[1] || a[2] - b[2]);
  const [major, minor, patch] = parsed[parsed.length - 1];
  return `v${major}.${minor}.${patch + 1}`;
}

export async function saveVersion(params: {
  slotId: string;
  version: string;
  promptText: string;
  model: string;
  description: string;
}): Promise<string> {
  const { data, error } = await supabase.rpc("save_prompt_version", {
    p_slot_id: params.slotId,
    p_version: params.version,
    p_prompt_text: params.promptText,
    p_model: params.model,
    p_description: params.description,
  });

  if (error) throw new Error(error.message);
  return data as string;
}

export async function rollbackPrompt(params: {
  slotId: string;
  versionId: string;
}): Promise<void> {
  const { error } = await supabase.rpc("rollback_prompt", {
    p_slot_id: params.slotId,
    p_version_id: params.versionId,
  });

  if (error) throw new Error(error.message);
}
