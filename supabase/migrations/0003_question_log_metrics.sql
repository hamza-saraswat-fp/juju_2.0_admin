-- 0003_question_log_metrics.sql
-- Hero-card metrics for the Question Log page.
--
-- Returns a single JSON object with:
--   - 4 sparkline arrays, each 14 daily values, oldest → newest (idx 0 = 13 days
--     ago, idx 13 = today), bucketed at America/Chicago day boundaries
--   - true distinct-user counts for the current 7-day and prior 7-day windows
--   - open-escalation count as of NOW (not end-of-day)
--
-- Day boundaries: Chicago local midnight, converted back to UTC for comparison
-- against the timestamptz `created_at` column.

CREATE OR REPLACE FUNCTION public.get_question_log_metrics()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
DECLARE
  today_chi_utc timestamptz;
  result jsonb;
BEGIN
  -- UTC moment of Chicago midnight (start of today).
  today_chi_utc := (date_trunc('day', now() AT TIME ZONE 'America/Chicago'))
                     AT TIME ZONE 'America/Chicago';

  WITH
  parents AS (
    SELECT id, created_at, asker_slack_id, escalated_at
    FROM juju_feedback
    WHERE parent_feedback_id IS NULL
      AND vote IS NULL
      AND star_rating IS NULL
      AND answer_text IS NOT NULL
      AND created_at >= today_chi_utc - interval '30 days'
  ),
  -- 14 buckets, oldest first. idx 0 = 13 days ago, idx 13 = today.
  buckets AS (
    SELECT
      idx,
      today_chi_utc - ((13 - idx) || ' days')::interval AS day_start,
      today_chi_utc - ((13 - idx) || ' days')::interval + interval '1 day' AS day_end
    FROM generate_series(0, 13) AS idx
  ),
  per_day AS (
    SELECT
      b.idx,
      COUNT(p.id) AS messages,
      COUNT(*) FILTER (WHERE p.escalated_at IS NULL)::numeric
        / NULLIF(COUNT(p.id), 0)::numeric                         AS auto_resolve_rate,
      COUNT(DISTINCT p.asker_slack_id)
        FILTER (WHERE p.asker_slack_id IS NOT NULL)              AS unique_users_daily
    FROM buckets b
    LEFT JOIN parents p
      ON p.created_at >= b.day_start
     AND p.created_at <  b.day_end
    GROUP BY b.idx
  ),
  -- Open escalations as of the END of each day. Counts every parent row that
  -- was escalated by day_end and has no 'answered' child by day_end. Not bound
  -- to the 30-day parents CTE so old still-open escalations are included.
  open_per_day AS (
    SELECT
      b.idx,
      (
        SELECT COUNT(*)
        FROM juju_feedback p
        WHERE p.parent_feedback_id IS NULL
          AND p.vote IS NULL
          AND p.star_rating IS NULL
          AND p.answer_text IS NOT NULL
          AND p.escalated_at IS NOT NULL
          AND p.escalated_at < b.day_end
          AND NOT EXISTS (
            SELECT 1 FROM juju_feedback c
            WHERE c.parent_feedback_id = p.id
              AND c.vote = 'answered'
              AND c.created_at < b.day_end
          )
      ) AS open_count
    FROM buckets b
  ),
  -- True distinct askers in the current 7-day vs. prior 7-day windows.
  -- 7-day window = today + the 6 prior Chicago days.
  unique_user_windows AS (
    SELECT
      COUNT(DISTINCT asker_slack_id) FILTER (
        WHERE asker_slack_id IS NOT NULL
          AND created_at >= today_chi_utc - interval '6 days'
          AND created_at <  today_chi_utc + interval '1 day'
      ) AS uu_7d,
      COUNT(DISTINCT asker_slack_id) FILTER (
        WHERE asker_slack_id IS NOT NULL
          AND created_at >= today_chi_utc - interval '13 days'
          AND created_at <  today_chi_utc - interval '6 days'
      ) AS uu_prior_7d
    FROM parents
  ),
  -- Open escalations right now (not bucket-aligned).
  open_now AS (
    SELECT COUNT(*) AS n
    FROM juju_feedback p
    WHERE p.parent_feedback_id IS NULL
      AND p.vote IS NULL
      AND p.star_rating IS NULL
      AND p.answer_text IS NOT NULL
      AND p.escalated_at IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM juju_feedback c
        WHERE c.parent_feedback_id = p.id
          AND c.vote = 'answered'
      )
  )
  SELECT jsonb_build_object(
    'sparkline_messages',           (SELECT jsonb_agg(messages           ORDER BY idx) FROM per_day),
    'sparkline_auto_resolve',       (SELECT jsonb_agg(auto_resolve_rate  ORDER BY idx) FROM per_day),
    'sparkline_unique_users_daily', (SELECT jsonb_agg(unique_users_daily ORDER BY idx) FROM per_day),
    'sparkline_open_escalations',   (SELECT jsonb_agg(open_count         ORDER BY idx) FROM open_per_day),
    'unique_users_7d',              (SELECT uu_7d        FROM unique_user_windows),
    'unique_users_prior_7d',        (SELECT uu_prior_7d  FROM unique_user_windows),
    'open_escalations_now',         (SELECT n            FROM open_now)
  )
  INTO result;

  RETURN result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_question_log_metrics() TO anon, authenticated;
