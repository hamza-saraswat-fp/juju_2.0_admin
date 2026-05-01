-- 0011_digest_cron.sql
-- Replaces the Vercel-Cron + Vercel-API setup with a single Supabase Edge
-- Function (`digest`) called hourly by Supabase Cron. The function reads
-- app_config and decides whether the current Chicago wall-clock hour
-- matches a scheduled run, so DST is handled in code instead of by the
-- cron schedule itself.
--
-- Two values are read from Supabase Vault by the cron job:
--   digest_function_url   — full https URL to the deployed edge function
--   digest_function_key   — bearer token (we use the project's anon key
--                           since the function is deployed with
--                           --no-verify-jwt; rotating means rotating
--                           the Vault entry)
--
-- After applying this migration:
--   1) Insert real values into Vault:
--        select vault.create_secret(
--          'https://<project_ref>.supabase.co/functions/v1/digest',
--          'digest_function_url');
--        select vault.create_secret('<anon_key>', 'digest_function_key');
--   2) Verify the cron job in Dashboard → Database → Cron Jobs.

-- ─── Liveness column ──────────────────────────────────────────────────
-- Bumped every hourly tick (including skipped ticks), so we can confirm
-- the cron is firing without flooding digest_log with skip rows.
ALTER TABLE public.app_config
  ADD COLUMN IF NOT EXISTS last_tick_at timestamptz;

-- ─── Required extensions ──────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- ─── Allow the edge function (service role) to write digest_log ───────
-- Migration 0008 only granted SELECT to anon. The edge function uses the
-- service-role key which bypasses RLS, so no GRANT is strictly needed,
-- but we add an explicit policy for clarity.
DROP POLICY IF EXISTS "service role inserts digest_log" ON public.digest_log;
CREATE POLICY "service role inserts digest_log"
  ON public.digest_log FOR INSERT
  TO service_role
  WITH CHECK (true);

-- ─── Cron job ─────────────────────────────────────────────────────────
-- Hourly tick. The function itself decides whether to fire daily/weekly
-- based on app_config and the current Chicago hour.
--
-- Idempotent: unschedule any prior incarnation by name, then re-create.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'digest-tick') THEN
    PERFORM cron.unschedule('digest-tick');
  END IF;
END $$;

SELECT cron.schedule(
  'digest-tick',
  '0 * * * *',
  $cron$
    select net.http_post(
      url     := (select decrypted_secret from vault.decrypted_secrets
                   where name = 'digest_function_url'),
      headers := jsonb_build_object(
        'Content-Type',  'application/json',
        'Authorization', 'Bearer ' || (select decrypted_secret
                                         from vault.decrypted_secrets
                                         where name = 'digest_function_key')
      ),
      body    := '{}'::jsonb,
      timeout_milliseconds := 30000
    );
  $cron$
);
