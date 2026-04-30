import type { VercelRequest, VercelResponse } from "@vercel/node";
import { runDigest, type RunResult } from "../_lib/digestRunner";
import { createServerSupabase } from "../_lib/supabaseAdmin";

/**
 * Single hourly cron endpoint that reads the user-configured schedule from
 * app_config and decides whether to fire the daily and/or weekly digest
 * for this tick. Replaces the old per-kind cron endpoints.
 *
 * Schedule lives in app_config:
 *   daily_send_hour_chicago        (0–23)
 *   daily_send_weekdays_only       (Mon–Fri only when true)
 *   weekly_send_hour_chicago       (0–23)
 *   weekly_send_dow                (0=Sun..6=Sat, JS getDay convention)
 *
 * Idempotency: before firing, we check digest_log for a recent successful
 * send of the same kind (daily: within 20h, weekly: within 6 days) so a
 * duplicated cron tick or a manual "send now" earlier in the day does not
 * cause a second post.
 */
export default async function handler(
  _req: VercelRequest,
  res: VercelResponse,
): Promise<void> {
  const supabase = createServerSupabase();

  const { data: cfg, error: cfgErr } = await supabase
    .from("app_config")
    .select(
      "daily_digest_enabled, daily_send_hour_chicago, daily_send_weekdays_only, weekly_digest_enabled, weekly_send_hour_chicago, weekly_send_dow",
    )
    .eq("id", 1)
    .single();
  if (cfgErr || !cfg) {
    res.status(500).json({ error: cfgErr?.message ?? "no app_config row" });
    return;
  }

  // Current Chicago hour + day-of-week (JS getDay convention: 0=Sun..6=Sat)
  const now = new Date();
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Chicago",
    hour: "numeric",
    hour12: false,
    weekday: "short",
  });
  const parts = fmt.formatToParts(now);
  const hour = parseInt(
    parts.find((p) => p.type === "hour")?.value ?? "0",
    10,
  );
  const weekdayShort = parts.find((p) => p.type === "weekday")?.value ?? "Sun";
  const dow =
    ({ Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 } as const)[
      weekdayShort as "Sun"
    ] ?? 0;
  const isWeekday = dow >= 1 && dow <= 5;

  const fired: Array<{ kind: "daily" | "weekly"; result: RunResult }> = [];

  // ── Daily ──
  if (
    cfg.daily_digest_enabled &&
    hour === cfg.daily_send_hour_chicago &&
    (!cfg.daily_send_weekdays_only || isWeekday)
  ) {
    const recentlySent = await alreadySent(supabase, "daily", 20);
    if (!recentlySent) {
      const result = await runDigest("daily", "cron");
      fired.push({ kind: "daily", result });
    }
  }

  // ── Weekly ──
  if (
    cfg.weekly_digest_enabled &&
    hour === cfg.weekly_send_hour_chicago &&
    dow === cfg.weekly_send_dow
  ) {
    const recentlySent = await alreadySent(supabase, "weekly", 24 * 6);
    if (!recentlySent) {
      const result = await runDigest("weekly", "cron");
      fired.push({ kind: "weekly", result });
    }
  }

  res.status(200).json({
    chicago_hour: hour,
    chicago_dow: dow,
    fired,
  });
}

/**
 * Returns true if a successful digest of `kind` was logged within the past
 * `withinHours` hours. Cheap idempotency guard against duplicated ticks.
 */
async function alreadySent(
  supabase: ReturnType<typeof createServerSupabase>,
  kind: "daily" | "weekly",
  withinHours: number,
): Promise<boolean> {
  const cutoff = new Date(Date.now() - withinHours * 60 * 60 * 1000);
  const { data } = await supabase
    .from("digest_log")
    .select("id")
    .eq("kind", kind)
    .eq("status", "sent")
    .gte("created_at", cutoff.toISOString())
    .limit(1);
  return Boolean(data?.length);
}
