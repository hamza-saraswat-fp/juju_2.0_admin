-- 0009_app_config_templates.sql
-- Adds editable message templates to app_config so the digest copy can be
-- tweaked from the admin UI without a redeploy.
--
-- Templates use simple {variable} substitution. Available variables:
--
--   Daily:   {total} {auto_resolve_pct} {unique_users} {top_category}
--   Weekly:  {total} {auto_resolve_pct} {unique_users} {trend}
--            {top_3} {peak_day} {peak_day_count}
--
-- Slack mrkdwn applies — *bold*, _italic_, line breaks, emoji.

ALTER TABLE public.app_config
  ADD COLUMN IF NOT EXISTS daily_digest_template  text,
  ADD COLUMN IF NOT EXISTS weekly_digest_template text;

-- Seed defaults on the singleton row only if they're currently null. This
-- is idempotent: re-running the migration won't clobber a custom template
-- the user has already saved.
UPDATE public.app_config
SET
  daily_digest_template = COALESCE(
    daily_digest_template,
    E'🤖 *Juju yesterday*\n\n'
      || E'📊 *{total}* questions answered  ·  ⚡ *{auto_resolve_pct}* solved without needing a human\n'
      || E'👥 *{unique_users}* people helped from across the company\n'
      || E'🏆 Most-asked topic: *{top_category}*\n\n'
      || E'_Tap @juju in any channel to ask a question →_'
  ),
  weekly_digest_template = COALESCE(
    weekly_digest_template,
    E'🚀 *Juju this week*\n\n'
      || E'📊 *{total}* questions answered{trend}\n'
      || E'⚡ *{auto_resolve_pct}* solved automatically  ·  👥 *{unique_users}* unique askers\n'
      || E'🏆 Top 3 topics: {top_3}\n'
      || E'🌟 Most active day: *{peak_day}* ({peak_day_count} questions)\n\n'
      || E'_Tap @juju in any channel to ask a question →_'
  )
WHERE id = 1;
