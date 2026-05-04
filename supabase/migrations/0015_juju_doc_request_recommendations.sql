-- 0015_juju_doc_request_recommendations.sql
-- AI-generated recommendations on doc requests.
--
-- For each Slack-flagged row in juju_doc_requests, a Supabase edge function
-- (supabase/functions/generate-doc-recommendation/index.ts) reads the cited
-- Mintlify and Confluence sources from the parent juju_feedback row, compares
-- them against the verified answer, and writes back a classification + short
-- synopsis (for the table cell) + full reasoning (for the drawer).
--
-- Cron triggers the function every 2 minutes; the admin UI also exposes a
-- manual "Regenerate" button that calls the function with { id, force: true }.
--
-- Status values:
--   not_applicable — admin-created rows have no Juju context to compare against
--   pending        — bot inserted a slack_flag row; cron picks it up
--   generated      — recommendation populated successfully
--   failed         — generation hit an error; recommendation_error has details
--   stale          — reserved; not auto-set in v1, manual regenerate covers it

ALTER TABLE public.juju_doc_requests
  ADD COLUMN IF NOT EXISTS recommendation_status text NOT NULL DEFAULT 'not_applicable'
    CHECK (recommendation_status IN ('not_applicable','pending','generated','failed','stale')),
  ADD COLUMN IF NOT EXISTS recommendation_classification text
    CHECK (recommendation_classification IN ('correction','gap','clarification')),
  ADD COLUMN IF NOT EXISTS recommendation_synopsis text,
  ADD COLUMN IF NOT EXISTS recommendation_full text,
  ADD COLUMN IF NOT EXISTS recommendation_cited_sources jsonb,
  ADD COLUMN IF NOT EXISTS recommendation_generated_at timestamptz,
  ADD COLUMN IF NOT EXISTS recommendation_model text,
  ADD COLUMN IF NOT EXISTS recommendation_error text;

-- Backfill: any existing slack_flag rows become 'pending' so cron picks them
-- up. Admin-created rows correctly stay at the default 'not_applicable'.
UPDATE public.juju_doc_requests
   SET recommendation_status = 'pending'
 WHERE origin = 'slack_flag'
   AND recommendation_status = 'not_applicable';

-- Partial index for the cron's polling query — keeps it fast as the table
-- grows. Most rows transition out of 'pending' within minutes, so the index
-- stays small in steady state.
CREATE INDEX IF NOT EXISTS juju_doc_requests_pending_recs_idx
  ON public.juju_doc_requests (submitted_at)
  WHERE recommendation_status = 'pending';
