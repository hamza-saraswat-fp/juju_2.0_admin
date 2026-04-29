-- 0007_question_log_v3.sql
-- Phase 4: parametrize Phase 1 (hero) and Phase 3 (usage patterns) RPCs with
-- p_time_range so each card on the page can pick its own window.
--
-- Window mapping for both functions (matches Phase 2's RPC):
--   '24h' → 1 day  | '7d' → 7 days  | '30d' → 30 days  | 'all' → 90 days (cap)

-- ─── Phase 1 — hero card metrics ─────────────────────────────────────────
DROP FUNCTION IF EXISTS public.get_question_log_metrics();

CREATE OR REPLACE FUNCTION public.get_question_log_metrics(
  p_time_range text DEFAULT '7d'
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
DECLARE
  today_chi_utc timestamptz;
  window_days int;
  data_horizon_days int;
  is_all boolean;
  result jsonb;
BEGIN
  today_chi_utc := (date_trunc('day', now() AT TIME ZONE 'America/Chicago'))
                     AT TIME ZONE 'America/Chicago';

  window_days := CASE p_time_range
    WHEN '24h' THEN 1
    WHEN '7d'  THEN 7
    WHEN '30d' THEN 30
    WHEN 'all' THEN 90
    ELSE 7
  END;
  is_all := p_time_range = 'all';
  data_horizon_days := GREATEST(window_days * 2, 14);

  WITH
  parents AS (
    SELECT id, created_at, asker_slack_id, escalated_at
    FROM juju_feedback
    WHERE parent_feedback_id IS NULL
      AND vote IS NULL
      AND star_rating IS NULL
      AND answer_text IS NOT NULL
      AND created_at >= today_chi_utc - (data_horizon_days || ' days')::interval
  ),

  -- Sparkline: always last 14 days, fixed (visual context independent of toggle)
  spark_buckets AS (
    SELECT idx,
      today_chi_utc - ((13 - idx) || ' days')::interval AS day_start,
      today_chi_utc - ((13 - idx) || ' days')::interval + interval '1 day' AS day_end
    FROM generate_series(0, 13) AS idx
  ),
  per_day AS (
    SELECT
      b.idx,
      COUNT(p.id) AS messages,
      COUNT(*) FILTER (WHERE p.escalated_at IS NULL)::numeric
        / NULLIF(COUNT(p.id), 0)::numeric AS auto_resolve_rate,
      COUNT(DISTINCT p.asker_slack_id) FILTER (WHERE p.asker_slack_id IS NOT NULL) AS unique_users_daily
    FROM spark_buckets b
    LEFT JOIN parents p
      ON p.created_at >= b.day_start AND p.created_at < b.day_end
    GROUP BY b.idx
  ),
  open_per_day AS (
    SELECT b.idx,
      (
        SELECT COUNT(*) FROM juju_feedback p
        WHERE p.parent_feedback_id IS NULL
          AND p.vote IS NULL AND p.star_rating IS NULL AND p.answer_text IS NOT NULL
          AND p.escalated_at IS NOT NULL
          AND p.escalated_at < b.day_end
          AND NOT EXISTS (
            SELECT 1 FROM juju_feedback c
            WHERE c.parent_feedback_id = p.id
              AND c.vote = 'answered'
              AND c.created_at < b.day_end
          )
      ) AS open_count
    FROM spark_buckets b
  ),

  -- Window scalars: aggregates over the chosen window + the prior equivalent
  window_scalars AS (
    SELECT
      -- Avg questions per day in current window
      (
        SELECT COUNT(*)::numeric / window_days::numeric
        FROM parents p
        WHERE p.created_at >= today_chi_utc - ((window_days - 1) || ' days')::interval
          AND p.created_at <  today_chi_utc + interval '1 day'
      ) AS avg_messages_window,
      -- Prior window (NULL when 'all')
      CASE WHEN is_all THEN NULL ELSE (
        SELECT COUNT(*)::numeric / window_days::numeric
        FROM parents p
        WHERE p.created_at >= today_chi_utc - ((2 * window_days - 1) || ' days')::interval
          AND p.created_at <  today_chi_utc - ((window_days - 1) || ' days')::interval
      ) END AS avg_messages_prior,

      -- Auto-resolve rate in window
      (
        SELECT COUNT(*) FILTER (WHERE p.escalated_at IS NULL)::numeric
          / NULLIF(COUNT(*), 0)::numeric
        FROM parents p
        WHERE p.created_at >= today_chi_utc - ((window_days - 1) || ' days')::interval
          AND p.created_at <  today_chi_utc + interval '1 day'
      ) AS auto_resolve_window,
      CASE WHEN is_all THEN NULL ELSE (
        SELECT COUNT(*) FILTER (WHERE p.escalated_at IS NULL)::numeric
          / NULLIF(COUNT(*), 0)::numeric
        FROM parents p
        WHERE p.created_at >= today_chi_utc - ((2 * window_days - 1) || ' days')::interval
          AND p.created_at <  today_chi_utc - ((window_days - 1) || ' days')::interval
      ) END AS auto_resolve_prior,

      -- True distinct users in current window
      (
        SELECT COUNT(DISTINCT asker_slack_id) FILTER (WHERE asker_slack_id IS NOT NULL)
        FROM parents p
        WHERE p.created_at >= today_chi_utc - ((window_days - 1) || ' days')::interval
          AND p.created_at <  today_chi_utc + interval '1 day'
      ) AS uu_window,
      CASE WHEN is_all THEN NULL ELSE (
        SELECT COUNT(DISTINCT asker_slack_id) FILTER (WHERE asker_slack_id IS NOT NULL)
        FROM parents p
        WHERE p.created_at >= today_chi_utc - ((2 * window_days - 1) || ' days')::interval
          AND p.created_at <  today_chi_utc - ((window_days - 1) || ' days')::interval
      ) END AS uu_prior_window
  ),

  -- Open escalations: current count, plus snapshot at start of window for trend
  open_now AS (
    SELECT COUNT(*) AS n
    FROM juju_feedback p
    WHERE p.parent_feedback_id IS NULL
      AND p.vote IS NULL AND p.star_rating IS NULL AND p.answer_text IS NOT NULL
      AND p.escalated_at IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM juju_feedback c
        WHERE c.parent_feedback_id = p.id AND c.vote = 'answered'
      )
  ),
  open_window_ago AS (
    SELECT CASE WHEN is_all THEN NULL ELSE (
      SELECT COUNT(*) FROM juju_feedback p
      WHERE p.parent_feedback_id IS NULL
        AND p.vote IS NULL AND p.star_rating IS NULL AND p.answer_text IS NOT NULL
        AND p.escalated_at IS NOT NULL
        AND p.escalated_at < today_chi_utc - ((window_days - 1) || ' days')::interval
        AND NOT EXISTS (
          SELECT 1 FROM juju_feedback c
          WHERE c.parent_feedback_id = p.id
            AND c.vote = 'answered'
            AND c.created_at < today_chi_utc - ((window_days - 1) || ' days')::interval
        )
    ) END AS n
  )

  SELECT jsonb_build_object(
    'sparkline_messages',          (SELECT jsonb_agg(messages           ORDER BY idx) FROM per_day),
    'sparkline_auto_resolve',      (SELECT jsonb_agg(auto_resolve_rate  ORDER BY idx) FROM per_day),
    'sparkline_unique_users_daily',(SELECT jsonb_agg(unique_users_daily ORDER BY idx) FROM per_day),
    'sparkline_open_escalations',  (SELECT jsonb_agg(open_count         ORDER BY idx) FROM open_per_day),
    'avg_messages_window',         (SELECT avg_messages_window  FROM window_scalars),
    'avg_messages_prior',          (SELECT avg_messages_prior   FROM window_scalars),
    'auto_resolve_window',         (SELECT auto_resolve_window  FROM window_scalars),
    'auto_resolve_prior',          (SELECT auto_resolve_prior   FROM window_scalars),
    'unique_users_window',         (SELECT uu_window            FROM window_scalars),
    'unique_users_prior',          (SELECT uu_prior_window      FROM window_scalars),
    'open_escalations_now',        (SELECT n FROM open_now),
    'open_escalations_window_ago', (SELECT n FROM open_window_ago)
  )
  INTO result;

  RETURN result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_question_log_metrics(text)
  TO anon, authenticated;


-- ─── Phase 3 — usage patterns (heatmap + weekly auto-resolve trend) ─────
DROP FUNCTION IF EXISTS public.get_question_log_phase3(text, text, text);

CREATE OR REPLACE FUNCTION public.get_question_log_phase3(
  p_time_range text DEFAULT '30d',
  p_category   text DEFAULT 'ALL',
  p_escalation text DEFAULT 'ALL',
  p_verified   text DEFAULT 'ALL'
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
DECLARE
  today_chi_utc timestamptz;
  window_days int;
  weekly_bucket_count int;
  this_week_chi_start timestamp;
  result jsonb;
BEGIN
  today_chi_utc := (date_trunc('day', now() AT TIME ZONE 'America/Chicago'))
                     AT TIME ZONE 'America/Chicago';
  this_week_chi_start := date_trunc('week', now() AT TIME ZONE 'America/Chicago');

  window_days := CASE p_time_range
    WHEN '24h' THEN 1
    WHEN '7d'  THEN 7
    WHEN '30d' THEN 30
    WHEN 'all' THEN 90
    ELSE 30
  END;
  weekly_bucket_count := LEAST(13, GREATEST(1, CEIL(window_days::numeric / 7)::int));

  WITH
  parents_w AS (
    SELECT id, created_at, escalated_at, escalated_to, escalation_type, category
    FROM juju_feedback
    WHERE parent_feedback_id IS NULL
      AND vote IS NULL
      AND star_rating IS NULL
      AND answer_text IS NOT NULL
      AND created_at >= today_chi_utc - GREATEST(window_days, weekly_bucket_count * 7) * interval '1 day'
  ),
  parents_aug AS (
    SELECT
      p.*,
      COALESCE(
        (
          SELECT c.manual_category_override
          FROM juju_feedback c
          WHERE c.parent_feedback_id = p.id
            AND c.vote = 'verified'
            AND c.message_ts IS NULL
            AND c.manual_category_override IS NOT NULL
          ORDER BY c.created_at DESC
          LIMIT 1
        ),
        p.category
      ) AS effective_category,
      EXISTS (
        SELECT 1 FROM juju_feedback c2
        WHERE c2.parent_feedback_id = p.id AND c2.vote = 'answered'
      ) AS has_verified_answer
    FROM parents_w p
  ),
  parents_filtered AS (
    SELECT * FROM parents_aug
    WHERE (p_category = 'ALL' OR effective_category = p_category)
      AND CASE p_escalation
        WHEN 'ALL'  THEN TRUE
        WHEN 'any'  THEN escalated_at IS NOT NULL
        WHEN 'auto' THEN escalation_type = 'auto'
        WHEN 'user' THEN escalation_type = 'user'
        WHEN 'none' THEN escalated_at IS NULL
        ELSE TRUE
      END
      AND CASE p_verified
        WHEN 'ALL' THEN TRUE
        WHEN 'yes' THEN has_verified_answer
        WHEN 'no'  THEN NOT has_verified_answer
        ELSE TRUE
      END
  ),

  -- 1. Heatmap: 168 cells over the chosen window
  heatmap_cells AS (
    SELECT dow, hour
    FROM generate_series(0, 6) AS dow,
         generate_series(0, 23) AS hour
  ),
  heatmap_counts AS (
    SELECT
      hc.dow, hc.hour,
      COUNT(p.id) AS cnt
    FROM heatmap_cells hc
    LEFT JOIN parents_filtered p
      ON (extract(isodow FROM (p.created_at AT TIME ZONE 'America/Chicago'))::int - 1) = hc.dow
     AND extract(hour FROM (p.created_at AT TIME ZONE 'America/Chicago'))::int = hc.hour
     AND p.created_at >= today_chi_utc - ((window_days - 1) || ' days')::interval
     AND p.created_at <  today_chi_utc + interval '1 day'
    GROUP BY hc.dow, hc.hour
  ),

  -- 2. Auto-resolve weekly trend (window-driven bucket count)
  weeks AS (
    SELECT idx,
      (this_week_chi_start - ((weekly_bucket_count - 1 - idx) || ' weeks')::interval) AS week_start_chi,
      ((this_week_chi_start - ((weekly_bucket_count - 1 - idx) || ' weeks')::interval)
        AT TIME ZONE 'America/Chicago') AS week_start_utc,
      ((this_week_chi_start - ((weekly_bucket_count - 1 - idx) || ' weeks')::interval + interval '1 week')
        AT TIME ZONE 'America/Chicago') AS week_end_utc
    FROM generate_series(0, weekly_bucket_count - 1) AS idx
  ),
  weekly_rates AS (
    SELECT
      w.idx, w.week_start_chi,
      COUNT(p.id) AS total,
      COUNT(*) FILTER (WHERE p.id IS NOT NULL AND p.escalated_at IS NULL)::numeric
        / NULLIF(COUNT(p.id), 0)::numeric AS rate
    FROM weeks w
    LEFT JOIN parents_filtered p
      ON p.created_at >= w.week_start_utc
     AND p.created_at <  w.week_end_utc
    GROUP BY w.idx, w.week_start_chi
  )

  SELECT jsonb_build_object(
    'heatmap', (
      SELECT COALESCE(jsonb_agg(cnt ORDER BY dow, hour), '[]'::jsonb)
      FROM heatmap_counts
    ),
    'auto_resolve_weekly', (
      SELECT COALESCE(jsonb_agg(
        jsonb_build_object(
          'week_start', to_char(week_start_chi, 'YYYY-MM-DD'),
          'rate',       rate,
          'total',      total
        ) ORDER BY idx
      ), '[]'::jsonb)
      FROM weekly_rates
    )
  )
  INTO result;

  RETURN result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_question_log_phase3(text, text, text, text)
  TO anon, authenticated;
