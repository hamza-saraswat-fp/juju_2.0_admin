-- 0004_question_log_phase2.sql
-- Tier-2 metrics for the Question Log page (between hero cards and table).
--
-- Returns one JSON object with six sections:
--   volume_over_time            — last 30 Chicago days, daily count + 7-day rolling avg
--   escalation_composition      — last 8 Chicago weeks, auto vs. user escalations
--   top_categories              — last 30 days, top 8 effective categories by volume
--   escalation_rate_by_category — last 30 days, top 8 effective categories by escalation rate (min 5)
--   po_leaderboard              — last 30 days, every PO who got tagged or answered
--   repeat_questions            — last 30 days, exact-text matches asked ≥ 3 times (top 10)
--
-- "Effective category" honors the latest reroute child:
--   COALESCE(latest reroute override, parent.category)
-- where a reroute child is: vote='verified' AND message_ts IS NULL AND
--   manual_category_override IS NOT NULL.
--
-- Day/week boundaries: America/Chicago.

CREATE OR REPLACE FUNCTION public.get_question_log_phase2()
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
  -- ── Parents window: last 30 Chicago days ─────────────────────────────
  parents_30d AS (
    SELECT id, created_at, asker_slack_id, escalated_at, escalated_to,
           escalation_type, category, question
    FROM juju_feedback
    WHERE parent_feedback_id IS NULL
      AND vote IS NULL
      AND star_rating IS NULL
      AND answer_text IS NOT NULL
      AND created_at >= today_chi_utc - interval '30 days'
  ),
  -- Effective category per parent: latest reroute override falls back to category.
  parent_effective_cat AS (
    SELECT
      p.id, p.created_at, p.escalated_at,
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
      ) AS effective_category
    FROM parents_30d p
  ),

  -- ── 1. Volume over time: 30 daily buckets ────────────────────────────
  vol_buckets AS (
    SELECT
      idx,
      today_chi_utc - ((29 - idx) || ' days')::interval AS day_start,
      today_chi_utc - ((29 - idx) || ' days')::interval + interval '1 day' AS day_end
    FROM generate_series(0, 29) AS idx
  ),
  vol_per_day AS (
    SELECT
      b.idx,
      b.day_start,
      COUNT(p.id) AS cnt
    FROM vol_buckets b
    LEFT JOIN parents_30d p
      ON p.created_at >= b.day_start
     AND p.created_at <  b.day_end
    GROUP BY b.idx, b.day_start
  ),
  vol_with_avg AS (
    SELECT
      idx, day_start, cnt,
      AVG(cnt) OVER (ORDER BY idx ROWS BETWEEN 6 PRECEDING AND CURRENT ROW) AS rolling_7
    FROM vol_per_day
  ),

  -- ── 2. Escalation composition: 8 weekly buckets ──────────────────────
  -- Wider window than 30 days, so compute escalations directly from the table
  -- without relying on parents_30d.
  this_week_chi_start AS (
    SELECT date_trunc('week', now() AT TIME ZONE 'America/Chicago') AS wstart
  ),
  esc_weeks AS (
    SELECT
      idx,
      ((SELECT wstart FROM this_week_chi_start) - ((7 - idx) || ' weeks')::interval)
        AS week_start_chi,
      ((SELECT wstart FROM this_week_chi_start) - ((7 - idx) || ' weeks')::interval)
        AT TIME ZONE 'America/Chicago' AS week_start_utc,
      ((SELECT wstart FROM this_week_chi_start) - ((7 - idx) || ' weeks')::interval + interval '1 week')
        AT TIME ZONE 'America/Chicago' AS week_end_utc
    FROM generate_series(0, 7) AS idx
  ),
  esc_per_week AS (
    SELECT
      w.idx,
      w.week_start_chi,
      COUNT(*) FILTER (WHERE p.escalation_type = 'auto') AS auto_count,
      COUNT(*) FILTER (WHERE p.escalation_type = 'user') AS user_count
    FROM esc_weeks w
    LEFT JOIN juju_feedback p
      ON p.parent_feedback_id IS NULL
     AND p.vote IS NULL
     AND p.star_rating IS NULL
     AND p.answer_text IS NOT NULL
     AND p.escalated_at IS NOT NULL
     AND p.escalated_at >= w.week_start_utc
     AND p.escalated_at <  w.week_end_utc
    GROUP BY w.idx, w.week_start_chi
  ),

  -- ── 3. Top categories ────────────────────────────────────────────────
  top_cats AS (
    SELECT effective_category, COUNT(*) AS cnt
    FROM parent_effective_cat
    WHERE effective_category IS NOT NULL
    GROUP BY effective_category
    ORDER BY cnt DESC, effective_category ASC
    LIMIT 8
  ),

  -- ── 4. Escalation rate by category (min 5 questions in window) ──────
  esc_rate_cats AS (
    SELECT
      effective_category,
      COUNT(*) AS total,
      COUNT(*) FILTER (WHERE escalated_at IS NOT NULL)::numeric / COUNT(*)::numeric AS rate
    FROM parent_effective_cat
    WHERE effective_category IS NOT NULL
    GROUP BY effective_category
    HAVING COUNT(*) >= 5
    ORDER BY rate DESC, effective_category ASC
    LIMIT 8
  ),

  -- ── 5. PO leaderboard ────────────────────────────────────────────────
  -- "PO" = anyone who appears as either an escalated_to recipient or as a
  -- vote='answered' answerer in the 30-day window.
  --
  -- Tagged: parent.escalated_at falls in window AND escalated_to = po
  -- Verified: child.vote='answered' AND child.created_at in window AND voter_slack_id = po
  -- Avg response: AVG(child.created_at - parent.escalated_at) for child rows above
  -- escalated_to may contain a comma-separated list of Slack IDs when a
  -- question is tagged to multiple POs. Split + trim so each gets its own row.
  tags_30d AS (
    SELECT
      p.id,
      trim(unnest(string_to_array(p.escalated_to, ','))) AS slack_id,
      p.escalated_at
    FROM juju_feedback p
    WHERE p.parent_feedback_id IS NULL
      AND p.vote IS NULL
      AND p.star_rating IS NULL
      AND p.answer_text IS NOT NULL
      AND p.escalated_at IS NOT NULL
      AND p.escalated_to IS NOT NULL
      AND p.escalated_at >= today_chi_utc - interval '30 days'
  ),
  answers_30d AS (
    SELECT c.parent_feedback_id, c.voter_slack_id, c.created_at AS answered_at
    FROM juju_feedback c
    WHERE c.vote = 'answered'
      AND c.voter_slack_id IS NOT NULL
      AND c.created_at >= today_chi_utc - interval '30 days'
  ),
  all_pos AS (
    SELECT slack_id FROM tags_30d
      WHERE slack_id IS NOT NULL AND length(slack_id) > 0
    UNION
    SELECT voter_slack_id FROM answers_30d
  ),
  po_stats AS (
    SELECT
      pos.slack_id,
      (SELECT COUNT(*) FROM tags_30d t WHERE t.slack_id = pos.slack_id) AS tagged,
      (SELECT COUNT(*) FROM answers_30d a WHERE a.voter_slack_id = pos.slack_id) AS verified,
      (
        SELECT AVG(EXTRACT(EPOCH FROM (a.answered_at - p.escalated_at)) / 3600.0)
        FROM answers_30d a
        JOIN juju_feedback p ON p.id = a.parent_feedback_id
        WHERE a.voter_slack_id = pos.slack_id
          AND p.escalated_at IS NOT NULL
          AND a.answered_at > p.escalated_at
      ) AS avg_response_hours
    FROM all_pos pos
  ),

  -- ── 6. Repeat questions (exact text match for v1) ────────────────────
  -- TODO(phase3+): upgrade to semantic similarity (pg_trgm or vector embeddings)
  -- so "How do I reset my password" and "how do i reset my password?" group.
  repeats AS (
    SELECT question, COUNT(*) AS cnt
    FROM parents_30d
    WHERE question IS NOT NULL
      AND length(trim(question)) > 0
    GROUP BY question
    HAVING COUNT(*) >= 3
    ORDER BY cnt DESC, question ASC
    LIMIT 10
  )

  SELECT jsonb_build_object(
    'volume_over_time', (
      SELECT jsonb_agg(
        jsonb_build_object(
          'day',       to_char(day_start AT TIME ZONE 'America/Chicago', 'YYYY-MM-DD'),
          'count',     cnt,
          'rolling_7', rolling_7
        ) ORDER BY idx
      )
      FROM vol_with_avg
    ),
    'escalation_composition', (
      SELECT jsonb_agg(
        jsonb_build_object(
          'week_start', to_char(week_start_chi, 'YYYY-MM-DD'),
          'auto',       auto_count,
          'user',       user_count
        ) ORDER BY idx
      )
      FROM esc_per_week
    ),
    'top_categories', (
      SELECT COALESCE(
        jsonb_agg(
          jsonb_build_object('category', effective_category, 'count', cnt)
          ORDER BY cnt DESC, effective_category ASC
        ),
        '[]'::jsonb
      )
      FROM top_cats
    ),
    'escalation_rate_by_category', (
      SELECT COALESCE(
        jsonb_agg(
          jsonb_build_object(
            'category', effective_category,
            'total',    total,
            'rate',     rate
          ) ORDER BY rate DESC, effective_category ASC
        ),
        '[]'::jsonb
      )
      FROM esc_rate_cats
    ),
    'po_leaderboard', (
      SELECT COALESCE(
        jsonb_agg(
          jsonb_build_object(
            'slack_id',           slack_id,
            'tagged',             tagged,
            'verified',           verified,
            'verified_rate',      CASE WHEN tagged > 0 THEN verified::numeric / tagged ELSE NULL END,
            'avg_response_hours', avg_response_hours
          ) ORDER BY tagged DESC, verified DESC, slack_id ASC
        ),
        '[]'::jsonb
      )
      FROM po_stats
    ),
    'repeat_questions', (
      SELECT COALESCE(
        jsonb_agg(
          jsonb_build_object('question', question, 'count', cnt)
          ORDER BY cnt DESC, question ASC
        ),
        '[]'::jsonb
      )
      FROM repeats
    )
  )
  INTO result;

  RETURN result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_question_log_phase2() TO anon, authenticated;
