-- 0010_app_config_schedule.sql
-- Adds user-configurable schedule fields to app_config so the digest send
-- time + day-of-week can be edited from the admin UI without redeploying.
--
-- All times are stored as the hour-of-day in America/Chicago (0–23).
-- Day-of-week uses JS's getDay() convention (0 = Sunday, 6 = Saturday).
--
-- The cron itself is rewritten to a single hourly "tick" endpoint that
-- reads these values and decides whether to fire. See vercel.json + the
-- new api/cron/digest-tick handler.

ALTER TABLE public.app_config
  ADD COLUMN IF NOT EXISTS daily_send_hour_chicago int NOT NULL DEFAULT 9
    CHECK (daily_send_hour_chicago BETWEEN 0 AND 23);

ALTER TABLE public.app_config
  ADD COLUMN IF NOT EXISTS daily_send_weekdays_only boolean NOT NULL DEFAULT true;

ALTER TABLE public.app_config
  ADD COLUMN IF NOT EXISTS weekly_send_hour_chicago int NOT NULL DEFAULT 9
    CHECK (weekly_send_hour_chicago BETWEEN 0 AND 23);

-- Day-of-week: 0 = Sunday, 1 = Monday, ..., 6 = Saturday (JS Date.getDay)
ALTER TABLE public.app_config
  ADD COLUMN IF NOT EXISTS weekly_send_dow int NOT NULL DEFAULT 1
    CHECK (weekly_send_dow BETWEEN 0 AND 6);
