import type { SupabaseClient } from "@supabase/supabase-js";
// Relative imports (not @-aliases) so this module bundles cleanly when
// pulled in from a Vercel serverless function under /api as well as from
// the Vite SPA build.
import { CATEGORY_LABELS } from "../config/jujuTaxonomy";
import type { Category } from "../types/question";

/**
 * Block Kit + fallback text for the daily and weekly Slack digests. Pure
 * functions — both serverless cron handlers and the admin "Send now" path
 * call these.
 *
 * Tone: public-channel, adoption-focused, emoji-friendly. Deliberately
 * avoids internal-ops language (no "escalation", "SLA", "PO", "verified",
 * "needs attention").
 *
 * Templates are user-editable from the admin UI and stored in
 * `app_config.daily_digest_template` / `weekly_digest_template`. They use
 * `{variable}` substitution — see DAILY_VARIABLES / WEEKLY_VARIABLES.
 */

export interface SlackBlock {
  type: string;
  [key: string]: unknown;
}

export interface DigestPayload {
  text: string; // fallback for notifications + accessibility
  blocks: SlackBlock[];
}

// ─── Default templates (also seeded by migration 0009) ─────────────────
export const DEFAULT_DAILY_TEMPLATE =
  "🤖 *Juju yesterday*\n\n" +
  "📊 *{total}* questions answered  ·  ⚡ *{auto_resolve_pct}* solved without needing a human\n" +
  "👥 *{unique_users}* people helped from across the company\n" +
  "🏆 Most-asked topic: *{top_category}*\n\n" +
  "_Tap @juju in any channel to ask a question →_";

export const DEFAULT_WEEKLY_TEMPLATE =
  "🚀 *Juju this week*\n\n" +
  "📊 *{total}* questions answered{trend}\n" +
  "⚡ *{auto_resolve_pct}* solved automatically  ·  👥 *{unique_users}* unique askers\n" +
  "🏆 Top 3 topics: {top_3}\n" +
  "🌟 Most active day: *{peak_day}* ({peak_day_count} questions)\n\n" +
  "_Tap @juju in any channel to ask a question →_";

// Variable names available in each template (for the in-UI hint).
export const DAILY_VARIABLES = [
  "total",
  "auto_resolve_pct",
  "unique_users",
  "top_category",
] as const;

export const WEEKLY_VARIABLES = [
  "total",
  "auto_resolve_pct",
  "unique_users",
  "trend",
  "top_3",
  "peak_day",
  "peak_day_count",
] as const;

// ─── Helpers ───────────────────────────────────────────────────────────
function categoryLabel(raw: string | null | undefined): string {
  if (!raw) return "Various";
  return CATEGORY_LABELS[raw as Category] ?? raw;
}

function formatPct(n: number | null | undefined): string {
  if (n === null || n === undefined) return "—";
  return `${Math.round(n * 100)}%`;
}

function trendString(current: number, prior: number | null): string {
  if (prior === null || prior === 0) return "";
  const pct = ((current - prior) / prior) * 100;
  const sign = pct >= 0 ? "+" : "";
  return ` (*${sign}${pct.toFixed(0)}%* vs last week)`;
}

/** Replace {var} placeholders. Unknown vars are left alone (visible in output
 * — that's intentional so a typo'd template is obvious). */
function renderTemplate(
  template: string,
  vars: Record<string, string>,
): string {
  return template.replace(/\{(\w+)\}/g, (_match, key) =>
    Object.prototype.hasOwnProperty.call(vars, key) ? vars[key] : `{${key}}`,
  );
}

/** Convert the rendered mrkdwn into a plain string for Slack's `text`
 * fallback (push notifications, screen readers). Strips `*bold*` and
 * `_italic_` markers; collapses newlines into " · ". */
function plainTextFallback(rendered: string): string {
  return rendered
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/_([^_]+)_/g, "$1")
    .replace(/\n+/g, " · ")
    .trim();
}

// ─── Variable computation ─────────────────────────────────────────────
async function fetchDailyVars(
  supabase: SupabaseClient,
): Promise<Record<string, string>> {
  const { data: hero, error: heroErr } = await supabase.rpc(
    "get_question_log_metrics",
    { p_time_range: "24h" },
  );
  if (heroErr) throw new Error(`hero RPC failed: ${heroErr.message}`);

  const { data: phase2, error: p2Err } = await supabase.rpc(
    "get_question_log_phase2",
    {
      p_time_range: "24h",
      p_category: "ALL",
      p_escalation: "ALL",
      p_verified: "ALL",
    },
  );
  if (p2Err) throw new Error(`phase2 RPC failed: ${p2Err.message}`);

  const total = Math.round(hero?.avg_messages_window ?? 0);
  const autoResolvePct = formatPct(hero?.auto_resolve_window ?? null);
  const uniqueUsers = hero?.unique_users_window ?? 0;
  const topCat = phase2?.top_categories?.[0];

  return {
    total: total.toString(),
    auto_resolve_pct: autoResolvePct,
    unique_users: uniqueUsers.toString(),
    top_category: categoryLabel(topCat?.category),
  };
}

async function fetchWeeklyVars(
  supabase: SupabaseClient,
): Promise<Record<string, string>> {
  const { data: hero, error: heroErr } = await supabase.rpc(
    "get_question_log_metrics",
    { p_time_range: "7d" },
  );
  if (heroErr) throw new Error(`hero RPC failed: ${heroErr.message}`);

  const { data: phase2, error: p2Err } = await supabase.rpc(
    "get_question_log_phase2",
    {
      p_time_range: "7d",
      p_category: "ALL",
      p_escalation: "ALL",
      p_verified: "ALL",
    },
  );
  if (p2Err) throw new Error(`phase2 RPC failed: ${p2Err.message}`);

  const { data: phase3, error: p3Err } = await supabase.rpc(
    "get_question_log_phase3",
    {
      p_time_range: "7d",
      p_category: "ALL",
      p_escalation: "ALL",
      p_verified: "ALL",
    },
  );
  if (p3Err) throw new Error(`phase3 RPC failed: ${p3Err.message}`);

  const avgPerDay: number = hero?.avg_messages_window ?? 0;
  const priorAvg: number | null = hero?.avg_messages_prior ?? null;
  const totalThisWeek = Math.round(avgPerDay * 7);
  const autoResolvePct = formatPct(hero?.auto_resolve_window ?? null);
  const uniqueUsers = hero?.unique_users_window ?? 0;

  const top3 =
    (phase2?.top_categories ?? [])
      .slice(0, 3)
      .map((c: { category: string }) => categoryLabel(c.category))
      .join(" · ") || "—";

  // Peak day from heatmap (168 cells, dow * 24 + hour, Mon=0..Sun=6).
  const heatmap: number[] = phase3?.heatmap ?? [];
  let peakDow = 0;
  let peakDowCount = 0;
  if (heatmap.length === 168) {
    for (let dow = 0; dow < 7; dow++) {
      let dayTotal = 0;
      for (let h = 0; h < 24; h++) {
        dayTotal += heatmap[dow * 24 + h] ?? 0;
      }
      if (dayTotal > peakDowCount) {
        peakDowCount = dayTotal;
        peakDow = dow;
      }
    }
  }

  const dayNames = [
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
    "Sunday",
  ];

  return {
    total: totalThisWeek.toString(),
    auto_resolve_pct: autoResolvePct,
    unique_users: uniqueUsers.toString(),
    trend: trendString(avgPerDay, priorAvg),
    top_3: top3,
    peak_day: dayNames[peakDow] ?? "—",
    peak_day_count: peakDowCount.toString(),
  };
}

// ─── Composers ────────────────────────────────────────────────────────
export async function composeDailyDigest(
  supabase: SupabaseClient,
  template: string = DEFAULT_DAILY_TEMPLATE,
): Promise<DigestPayload> {
  const vars = await fetchDailyVars(supabase);
  return renderToBlocks(template, vars);
}

export async function composeWeeklyDigest(
  supabase: SupabaseClient,
  template: string = DEFAULT_WEEKLY_TEMPLATE,
): Promise<DigestPayload> {
  const vars = await fetchWeeklyVars(supabase);
  return renderToBlocks(template, vars);
}

/** Render a template against pre-fetched vars without hitting the database.
 * Used by the admin UI's live preview. */
export function renderTemplateToBlocks(
  template: string,
  vars: Record<string, string>,
): DigestPayload {
  return renderToBlocks(template, vars);
}

// Export so the admin preview can compute vars without composing blocks.
export { fetchDailyVars, fetchWeeklyVars };

function renderToBlocks(
  template: string,
  vars: Record<string, string>,
): DigestPayload {
  const rendered = renderTemplate(template, vars);
  return {
    text: plainTextFallback(rendered),
    blocks: [
      {
        type: "section",
        text: { type: "mrkdwn", text: rendered },
      },
    ],
  };
}
