import type { PromptSlot } from "@/types/botConfig";

/**
 * Display metadata for each prompt slot. The `id` must match the `slot_id`
 * column in the Supabase `prompts` table. Adding a new slot is a code edit
 * here plus a seed row in `supabase/migrations/`.
 */
export type PromptSlotMeta = Pick<
  PromptSlot,
  "id" | "name" | "environment" | "availableModels"
>;

const MODELS = ["GPT 5.4", "Gemini 3 Pro", "Sonnet 4.6", "Haiku 4.5"];

export const PROMPT_SLOTS_META: PromptSlotMeta[] = [
  {
    id: "intent",
    name: "Intent Gate",
    environment: "production",
    availableModels: MODELS,
  },
  {
    id: "classifier",
    name: "Classifier",
    environment: "production",
    availableModels: MODELS,
  },
  {
    id: "help_center_mcp",
    name: "Help Center MCP",
    environment: "production",
    availableModels: MODELS,
  },
  {
    id: "confluence_search",
    name: "Confluence Search",
    environment: "production",
    availableModels: MODELS,
  },
  {
    id: "synthesis",
    name: "Synthesis",
    environment: "production",
    availableModels: MODELS,
  },
];
