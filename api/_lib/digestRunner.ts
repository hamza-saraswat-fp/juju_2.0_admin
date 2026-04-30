import {
  composeDailyDigest,
  composeWeeklyDigest,
  DEFAULT_DAILY_TEMPLATE,
  DEFAULT_WEEKLY_TEMPLATE,
  type DigestPayload,
} from "../../src/lib/digestPayload";
import { postSlackMessage } from "../../src/lib/slackClient";
import { createServerSupabase } from "./supabaseAdmin";

export type DigestKind = "daily" | "weekly";
export type TriggeredBy = "cron" | "manual";

export interface RunResult {
  status: "sent" | "skipped" | "failed";
  message: string;
  channel?: string;
  ts?: string;
  error?: string;
}

/**
 * Shared run loop used by both the cron handlers and the manual "send now"
 * endpoint. Reads `app_config`, decides whether to send (cron honors the
 * enable flag; manual bypasses it), composes the payload, posts to Slack,
 * appends one row to `digest_log`.
 */
export async function runDigest(
  kind: DigestKind,
  triggeredBy: TriggeredBy,
): Promise<RunResult> {
  const supabase = createServerSupabase();

  // ── Read config
  const { data: cfg, error: cfgErr } = await supabase
    .from("app_config")
    .select(
      "daily_digest_enabled, weekly_digest_enabled, digest_channel_id, daily_digest_template, weekly_digest_template",
    )
    .eq("id", 1)
    .single();
  if (cfgErr || !cfg) {
    const msg = `app_config read failed: ${cfgErr?.message ?? "no row"}`;
    return { status: "failed", message: msg, error: msg };
  }

  const channel = cfg.digest_channel_id as string | null;
  if (!channel) {
    return await logAndReturn(supabase, kind, triggeredBy, "", "skipped", {
      message: "no channel configured",
    });
  }

  // ── Cron honors the enabled flag; manual bypasses it
  if (triggeredBy === "cron") {
    const enabled =
      kind === "daily"
        ? Boolean(cfg.daily_digest_enabled)
        : Boolean(cfg.weekly_digest_enabled);
    if (!enabled) {
      return await logAndReturn(supabase, kind, triggeredBy, channel, "skipped", {
        message: `${kind} digest disabled`,
      });
    }
  }

  // ── Compose (using user-edited templates from app_config, with sane
  // fallback defaults if those columns are null)
  const template =
    kind === "daily"
      ? ((cfg.daily_digest_template as string | null) ??
        DEFAULT_DAILY_TEMPLATE)
      : ((cfg.weekly_digest_template as string | null) ??
        DEFAULT_WEEKLY_TEMPLATE);
  let payload: DigestPayload;
  try {
    payload =
      kind === "daily"
        ? await composeDailyDigest(supabase, template)
        : await composeWeeklyDigest(supabase, template);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return await logAndReturn(supabase, kind, triggeredBy, channel, "failed", {
      message: `compose failed: ${msg}`,
      error: msg,
    });
  }

  // ── Post
  try {
    const { ts } = await postSlackMessage({
      channel,
      text: payload.text,
      blocks: payload.blocks,
    });
    return await logAndReturn(supabase, kind, triggeredBy, channel, "sent", {
      message: "posted",
      ts,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return await logAndReturn(supabase, kind, triggeredBy, channel, "failed", {
      message: `slack post failed: ${msg}`,
      error: msg,
    });
  }
}

async function logAndReturn(
  supabase: ReturnType<typeof createServerSupabase>,
  kind: DigestKind,
  triggeredBy: TriggeredBy,
  channel: string,
  status: RunResult["status"],
  extra: { message: string; ts?: string; error?: string },
): Promise<RunResult> {
  await supabase.from("digest_log").insert({
    kind,
    triggered_by: triggeredBy,
    channel_id: channel,
    status,
    error: extra.error ?? null,
  });
  return {
    status,
    message: extra.message,
    channel,
    ts: extra.ts,
    error: extra.error,
  };
}
