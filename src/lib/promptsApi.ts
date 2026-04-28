import { supabase } from "@/lib/supabase";
import type { PromptSlot, PromptVersion } from "@/types/botConfig";

export const AVAILABLE_MODELS = [
  "GPT 5.4",
  "Gemini 3 Pro",
  "Sonnet 4.6",
  "Haiku 4.5",
];

// Words that should render fully uppercased in the display name. Add to this
// list when a new slot_id contains an acronym that the title-caser would
// otherwise spell as "Mcp" / "Api" / etc.
const ACRONYMS = new Set(["mcp", "api", "ui", "ai", "llm", "url", "id"]);

function formatSlotName(slotId: string): string {
  return slotId
    .split("_")
    .map((word) =>
      ACRONYMS.has(word.toLowerCase())
        ? word.toUpperCase()
        : word.charAt(0).toUpperCase() + word.slice(1),
    )
    .join(" ");
}

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

  // Group by slot_id while preserving the insertion order of the first
  // appearance — so the slot list is naturally ordered by oldest-first.
  const bySlot = new Map<string, PromptRow[]>();
  for (const row of rows) {
    const list = bySlot.get(row.slot_id) ?? [];
    list.push(row);
    bySlot.set(row.slot_id, list);
  }

  return Array.from(bySlot.entries()).map(([slotId, slotRows]) => {
    const versions = slotRows.map(rowToVersion);
    const activeRow = slotRows.find((r) => r.is_active);
    return {
      id: slotId,
      name: formatSlotName(slotId),
      environment: "production" as const,
      availableModels: AVAILABLE_MODELS,
      currentPrompt: activeRow?.prompt_text ?? "",
      model: activeRow?.model ?? AVAILABLE_MODELS[0],
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

// Creating a "new slot" is just inserting the first row for a slot_id that
// doesn't exist yet. The partial unique index `prompts_one_active_per_slot`
// guarantees this is the only active row for the slot.
export async function createPromptSlot(params: {
  id: string;
  promptText: string;
  model: string;
  description: string;
}): Promise<string> {
  const { data, error } = await supabase
    .from("prompts")
    .insert({
      slot_id: params.id,
      version: "v1.0.0",
      prompt_text: params.promptText,
      model: params.model,
      description: params.description,
      is_active: true,
    })
    .select("id")
    .single();

  if (error) throw new Error(error.message);
  return data.id as string;
}
