-- 0005_question_log_phase2_filtered.sql
-- Parametrize the Phase 2 RPC so the Tier 2 charts respect the filter bar.
--
-- Args:
--   p_time_range  '24h' | '7d' | '30d' | 'all'  (default '30d')
--                 'all' caps at 90 days for query perf.
--   p_category    'ALL' | one of the canonical category strings
--   p_escalation  'ALL' | 'any' | 'auto' | 'user' | 'none'
--   p_verified    'ALL' | 'yes' | 'no'  (verified = ≥1 'answered' child)
--
-- Per-section filter scope (matches Phase 3 spec):
--   Volume                  → time, category, escalation
--   Escalation composition  → time, category
--   Top categories          → time, escalation, verified
--   Escalation rate         → time
--   PO leaderboard          → time, category, verified
--   Repeat questions        → time, category
--
-- Bucket counts are derived from the window:
--   window_days = 1 / 7 / 30 / 90
--   weekly_bucket_count = ceil(window_days / 7), capped at 13.

DROP FUNCTION IF EXISTS public.get_question_log_phase2();

CREATE OR REPLACE FUNCTION public.get_question_log_phase2(
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
  result jsonb;
BEGIN
  today_chi_utc := (date_trunc('day', now() AT TIME ZONE 'America/Chicago'))
                     AT TIME ZONE 'America/Chicago';

  window_days := CASE p_time_range
    WHEN '24h' THEN 1
    WHEN '7d'  THEN 7
    WHEN '30d' THEN 30
    WHEN 'all' THEN 90
    ELSE 30
  END;

  weekly_bucket_count := LEAST(13, GREATEST(1, CEIL(window_days::numeric / 7)::int));

  WITH
  -- ── Parents in window ────────────────────────────────────────────────
  -- Convention matches Phase 1's RPC: "last N days" = [today-(N-1)d, today+1d)
  -- which is N calendar days inclusive of today. Equivalent to the bucket
  -- ranges used by vol_buckets / esc_weeks below.
  parents_w AS (
    SELECT id, created_at, asker_slack_id, escalated_at, escalated_to,
           escalation_type, category, question
    FROM juju_feedback
    WHERE parent_feedback_id IS NULL
      AND vote IS NULL
      AND star_rating IS NULL
      AND answer_text IS NOT NULL
      AND created_at >= today_chi_utc - ((window_days - 1) || ' days')::interval
      AND created_at <  today_chi_utc + interval '1 day'
  ),
  -- Effective category (latest reroute override falls back to category)
  -- and verified-answer flag, computed once.
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

  -- ── 1. Volume over time (time, category, escalation) ────────────────
  vol_buckets AS (
    SELECT
      idx,
      today_chi_utc - ((window_days - 1 - idx) || ' days')::interval AS day_start,
      today_chi_utc - ((window_days - 1 - idx) || ' days')::interval + interval '1 day' AS day_end
    FROM generate_series(0, window_days - 1) AS idx
  ),
  vol_filtered AS (
    SELECT id, created_at FROM parents_aug
    WHERE (p_category = 'ALL' OR effective_category = p_category)
      AND CASE p_escalation
        WHEN 'ALL'  THEN TRUE
        WHEN 'any'  THEN escalated_at IS NOT NULL
        WHEN 'auto' THEN escalation_type = 'auto'
        WHEN 'user' THEN escalation_type = 'user'
        WHEN 'none' THEN escalated_at IS NULL
        ELSE TRUE
      END
  ),
  vol_per_day AS (
    SELECT
      b.idx,
      b.day_start,
      COUNT(p.id) AS cnt
    FROM vol_buckets b
    LEFT JOIN vol_filtered p
      ON p.created_at >= b.day_start AND p.created_at < b.day_end
    GROUP BY b.idx, b.day_start
  ),
  vol_with_avg AS (
    SELECT
      idx, day_start, cnt,
      CASE
        WHEN window_days < 7 THEN NULL
        ELSE AVG(cnt) OVER (ORDER BY idx ROWS BETWEEN 6 PRECEDING AND CURRENT ROW)
      END AS rolling_7
    FROM vol_per_day
  ),

  -- ── 2. Escalation composition (time, category) ──────────────────────
  esc_weeks AS (
    SELECT
      idx,
      (date_trunc('week', now() AT TIME ZONE 'America/Chicago')
        - ((weekly_bucket_count - 1 - idx) || ' weeks')::interval) AS week_start_chi,
      ((date_trunc('week', now() AT TIME ZONE 'America/Chicago')
        - ((weekly_bucket_count - 1 - idx) || ' weeks')::interval)
        AT TIME ZONE 'America/Chicago') AS week_start_utc,
      ((date_trunc('week', now() AT TIME ZONE 'America/Chicago')
        - ((weekly_bucket_count - 1 - idx) || ' weeks')::interval + interval '1 week')
        AT TIME ZONE 'America/Chicago') AS week_end_utc
    FROM generate_series(0, weekly_bucket_count - 1) AS idx
  ),
  esc_filtered AS (
    SELECT id, escalated_at, escalation_type, effective_category
    FROM parents_aug
    WHERE escalated_at IS NOT NULL
      AND (p_category = 'ALL' OR effective_category = p_category)
  ),
  esc_per_week AS (
    SELECT
      w.idx, w.week_start_chi,
      COUNT(*) FILTER (WHERE p.escalation_type = 'auto') AS auto_count,
      COUNT(*) FILTER (WHERE p.escalation_type = 'user') AS user_count
    FROM esc_weeks w
    LEFT JOIN esc_filtered p
      ON p.escalated_at >= w.week_start_utc
     AND p.escalated_at <  w.week_end_utc
    GROUP BY w.idx, w.week_start_chi
  ),

  -- ── 3. Top categories (time, escalation, verified) ──────────────────
  top_cats AS (
    SELECT effective_category, COUNT(*) AS cnt
    FROM parents_aug
    WHERE effective_category IS NOT NULL
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
    GROUP BY effective_category
    ORDER BY cnt DESC, effective_category ASC
    LIMIT 8
  ),

  -- ── 4. Escalation rate by category (time only) ──────────────────────
  esc_rate_cats AS (
    SELECT
      effective_category,
      COUNT(*) AS total,
      COUNT(*) FILTER (WHERE escalated_at IS NOT NULL)::numeric / COUNT(*)::numeric AS rate
    FROM parents_aug
    WHERE effective_category IS NOT NULL
    GROUP BY effective_category
    HAVING COUNT(*) >= 5
    ORDER BY rate DESC, effective_category ASC
    LIMIT 8
  ),

  -- ── 5. PO leaderboard (time, category, verified) ────────────────────
  po_parent_filtered AS (
    SELECT id, escalated_to, escalated_at, has_verified_answer
    FROM parents_aug
    WHERE (p_category = 'ALL' OR effective_category = p_category)
      AND CASE p_verified
        WHEN 'ALL' THEN TRUE
        WHEN 'yes' THEN has_verified_answer
        WHEN 'no'  THEN NOT has_verified_answer
        ELSE TRUE
      END
  ),
  -- Split escalated_to on comma so multi-PO tags expand correctly.
  tags_w AS (
    SELECT
      p.id,
      trim(unnest(string_to_array(p.escalated_to, ','))) AS slack_id,
      p.escalated_at
    FROM po_parent_filtered p
    WHERE p.escalated_at IS NOT NULL
      AND p.escalated_to IS NOT NULL
  ),
  -- Answers in the same window. Filter to children whose parent's effective
  -- category passes the category filter.
  answers_w AS (
    SELECT c.parent_feedback_id, c.voter_slack_id, c.created_at AS answered_at
    FROM juju_feedback c
    JOIN parents_aug p ON p.id = c.parent_feedback_id
    WHERE c.vote = 'answered'
      AND c.voter_slack_id IS NOT NULL
      AND c.created_at >= today_chi_utc - ((window_days - 1) || ' days')::interval
      AND c.created_at <  today_chi_utc + interval '1 day'
      AND (p_category = 'ALL' OR p.effective_category = p_category)
  ),
  all_pos AS (
    SELECT slack_id FROM tags_w WHERE slack_id IS NOT NULL AND length(slack_id) > 0
    UNION
    SELECT voter_slack_id FROM answers_w
  ),
  po_stats AS (
    SELECT
      pos.slack_id,
      (SELECT COUNT(*) FROM tags_w t WHERE t.slack_id = pos.slack_id) AS tagged,
      (SELECT COUNT(*) FROM answers_w a WHERE a.voter_slack_id = pos.slack_id) AS verified,
      (
        SELECT AVG(EXTRACT(EPOCH FROM (a.answered_at - pp.escalated_at)) / 3600.0)
        FROM answers_w a
        JOIN juju_feedback pp ON pp.id = a.parent_feedback_id
        WHERE a.voter_slack_id = pos.slack_id
          AND pp.escalated_at IS NOT NULL
          AND a.answered_at > pp.escalated_at
      ) AS avg_response_hours
    FROM all_pos pos
  ),

  -- ── 6. Repeat questions (time, category) ────────────────────────────
  repeats AS (
    SELECT question, COUNT(*) AS cnt
    FROM parents_aug
    WHERE question IS NOT NULL
      AND length(trim(question)) > 0
      AND (p_category = 'ALL' OR effective_category = p_category)
    GROUP BY question
    HAVING COUNT(*) >= 3
    ORDER BY cnt DESC, question ASC
    LIMIT 10
  )

  -- ── Assemble ────────────────────────────────────────────────────────
  SELECT jsonb_build_object(
    'volume_over_time', (
      SELECT COALESCE(jsonb_agg(
        jsonb_build_object(
          'day',       to_char(day_start AT TIME ZONE 'America/Chicago', 'YYYY-MM-DD'),
          'count',     cnt,
          'rolling_7', rolling_7
        ) ORDER BY idx
      ), '[]'::jsonb)
      FROM vol_with_avg
    ),
    'escalation_composition', (
      SELECT COALESCE(jsonb_agg(
        jsonb_build_object(
          'week_start', to_char(week_start_chi, 'YYYY-MM-DD'),
          'auto',       auto_count,
          'user',       user_count
        ) ORDER BY idx
      ), '[]'::jsonb)
      FROM esc_per_week
    ),
    'top_categories', (
      SELECT COALESCE(jsonb_agg(
        jsonb_build_object('category', effective_category, 'count', cnt)
        ORDER BY cnt DESC, effective_category ASC
      ), '[]'::jsonb)
      FROM top_cats
    ),
    'escalation_rate_by_category', (
      SELECT COALESCE(jsonb_agg(
        jsonb_build_object('category', effective_category, 'total', total, 'rate', rate)
        ORDER BY rate DESC, effective_category ASC
      ), '[]'::jsonb)
      FROM esc_rate_cats
    ),
    'po_leaderboard', (
      SELECT COALESCE(jsonb_agg(
        jsonb_build_object(
          'slack_id',           slack_id,
          'tagged',             tagged,
          'verified',           verified,
          'verified_rate',      CASE WHEN tagged > 0 THEN verified::numeric / tagged ELSE NULL END,
          'avg_response_hours', avg_response_hours
        ) ORDER BY tagged DESC, verified DESC, slack_id ASC
      ), '[]'::jsonb)
      FROM po_stats
    ),
    'repeat_questions', (
      SELECT COALESCE(jsonb_agg(
        jsonb_build_object('question', question, 'count', cnt)
        ORDER BY cnt DESC, question ASC
      ), '[]'::jsonb)
      FROM repeats
    )
  )
  INTO result;

  RETURN result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_question_log_phase2(text, text, text, text)
  TO anon, authenticated;
