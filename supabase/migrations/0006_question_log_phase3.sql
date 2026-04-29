-- 0006_question_log_phase3.sql
-- Tier 3 (Usage Patterns) metrics: 7×24 day-of-week × hour heatmap (last 30
-- Chicago days) and 12-week auto-resolve rate trend.
--
-- Args (the time filter does NOT apply — Tier 3 windows are fixed by spec):
--   p_category    'ALL' | <category>
--   p_escalation  'ALL' | 'any' | 'auto' | 'user' | 'none'
--   p_verified    'ALL' | 'yes' | 'no'
--
-- Returns:
--   heatmap              — 168-element flat array (dow_mon0 * 24 + hour),
--                          0=Mon..6=Sun, 0..23 hour, Chicago time, 30 days
--   auto_resolve_weekly  — 12 entries oldest→newest, each
--                          {week_start, rate (0..1 or null), total}

CREATE OR REPLACE FUNCTION public.get_question_log_phase3(
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
  this_week_chi_start timestamp;
  result jsonb;
BEGIN
  today_chi_utc := (date_trunc('day', now() AT TIME ZONE 'America/Chicago'))
                     AT TIME ZONE 'America/Chicago';
  this_week_chi_start := date_trunc('week', now() AT TIME ZONE 'America/Chicago');

  WITH
  -- Parent rows over the largest needed window (12 weeks for auto-resolve trend).
  parents_w AS (
    SELECT id, created_at, escalated_at, escalated_to, escalation_type, category
    FROM juju_feedback
    WHERE parent_feedback_id IS NULL
      AND vote IS NULL
      AND star_rating IS NULL
      AND answer_text IS NOT NULL
      AND created_at >= (this_week_chi_start - interval '11 weeks') AT TIME ZONE 'America/Chicago'
  ),
  -- Effective category + verified flag, plus filter conditions in one CTE.
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
        WHERE c2.parent_feedback_id = p.id
          AND c2.vote = 'answered'
      ) AS has_verified_answer
    FROM parents_w p
  ),
  parents_filtered AS (
    SELECT *
    FROM parents_aug
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

  -- ── 1. Heatmap: 168 cells (7 × 24), last 30 Chicago days ─────────────
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
     AND p.created_at >= today_chi_utc - interval '29 days'
     AND p.created_at <  today_chi_utc + interval '1 day'
    GROUP BY hc.dow, hc.hour
  ),

  -- ── 2. Auto-resolve weekly trend (12 weeks) ──────────────────────────
  weeks AS (
    SELECT
      idx,
      (this_week_chi_start - ((11 - idx) || ' weeks')::interval) AS week_start_chi,
      ((this_week_chi_start - ((11 - idx) || ' weeks')::interval)
        AT TIME ZONE 'America/Chicago') AS week_start_utc,
      ((this_week_chi_start - ((11 - idx) || ' weeks')::interval + interval '1 week')
        AT TIME ZONE 'America/Chicago') AS week_end_utc
    FROM generate_series(0, 11) AS idx
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
      SELECT COALESCE(
        jsonb_agg(cnt ORDER BY dow, hour),
        '[]'::jsonb
      )
      FROM heatmap_counts
    ),
    'auto_resolve_weekly', (
      SELECT COALESCE(
        jsonb_agg(
          jsonb_build_object(
            'week_start', to_char(week_start_chi, 'YYYY-MM-DD'),
            'rate',       rate,
            'total',      total
          ) ORDER BY idx
        ),
        '[]'::jsonb
      )
      FROM weekly_rates
    )
  )
  INTO result;

  RETURN result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_question_log_phase3(text, text, text)
  TO anon, authenticated;
