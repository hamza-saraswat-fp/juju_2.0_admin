-- 0008_app_config.sql
-- Settings + audit log for the Slack adoption digest.
--
--   app_config  — singleton row keyed at id=1, stores the daily/weekly
--                 enable flags and the target Slack channel
--   digest_log  — append-only audit of every digest run (cron or manual),
--                 successful or otherwise

-- ─── app_config ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.app_config (
  id                    int PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  daily_digest_enabled  boolean NOT NULL DEFAULT false,
  weekly_digest_enabled boolean NOT NULL DEFAULT false,
  digest_channel_id     text,
  updated_at            timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.app_config (id) VALUES (1)
ON CONFLICT (id) DO NOTHING;

-- Auto-bump updated_at on UPDATE.
CREATE OR REPLACE FUNCTION public.app_config_touch_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS app_config_touch ON public.app_config;
CREATE TRIGGER app_config_touch
  BEFORE UPDATE ON public.app_config
  FOR EACH ROW
  EXECUTE FUNCTION public.app_config_touch_updated_at();

ALTER TABLE public.app_config ENABLE ROW LEVEL SECURITY;

-- Same pattern as the existing prompts table: anon SELECT/UPDATE is OK
-- because the admin SPA is gated by HTTP Basic Auth at the Vercel edge.
DROP POLICY IF EXISTS "anon read app_config"   ON public.app_config;
DROP POLICY IF EXISTS "anon update app_config" ON public.app_config;

CREATE POLICY "anon read app_config"
  ON public.app_config FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "anon update app_config"
  ON public.app_config FOR UPDATE
  TO anon, authenticated
  USING (id = 1)
  WITH CHECK (id = 1);

GRANT SELECT, UPDATE ON public.app_config TO anon, authenticated;


-- ─── digest_log ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.digest_log (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind         text NOT NULL CHECK (kind IN ('daily','weekly')),
  triggered_by text NOT NULL CHECK (triggered_by IN ('cron','manual')),
  channel_id   text NOT NULL,
  status       text NOT NULL CHECK (status IN ('sent','skipped','failed')),
  error        text,
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS digest_log_created_at_idx
  ON public.digest_log (created_at DESC);

ALTER TABLE public.digest_log ENABLE ROW LEVEL SECURITY;

-- Reads are fine for anon (admin shows last-N rows in the UI).
-- Writes go through the service-role key in serverless functions, so we
-- intentionally do NOT grant INSERT to anon.
DROP POLICY IF EXISTS "anon read digest_log" ON public.digest_log;
CREATE POLICY "anon read digest_log"
  ON public.digest_log FOR SELECT
  TO anon, authenticated
  USING (true);

GRANT SELECT ON public.digest_log TO anon, authenticated;
