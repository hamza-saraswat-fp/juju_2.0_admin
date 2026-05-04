-- 0014_juju_doc_requests.sql
-- Supabase-backed source of truth for the education team's doc/asset requests.
-- Replaces the Google Sheet ("Education Request Form") that the bot currently
-- writes to via a Slack workflow webhook. Mirrors the Sheet's column structure
-- so the admin UI can render a familiar table on the Knowledge Health page.
--
-- Two write paths:
--   1) Slack bot — when education team clicks 📝 Flag for Doc Request on the
--      #juju_escalations digest. Inserts row with origin='slack_flag' and
--      snapshots the question + verified answer + parent_feedback_id for
--      audit context.
--   2) Admin UI — when education team adds a standalone request from the
--      Knowledge Health page. Inserts row with origin='admin_create' and
--      no parent_feedback_id.
--
-- Read path: Knowledge Health page renders a sortable/filterable table with
-- inline editing of owner, task_status, priority_level, follow_up_with_requestor,
-- and notes. The bot does not read this table.
--
-- During transition the bot dual-writes to both Sheet (existing webhook) and
-- this table. Once education team is comfortable in the admin UI, the
-- EDUCATION_SHEET_WEBHOOK_URL env var gets unset and the Sheet path is removed.

CREATE TABLE IF NOT EXISTS public.juju_doc_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- ─── Capture-time fields (mirror the Sheet columns) ─────────────────
  project_name text NOT NULL,
  requestor_name text,
  due_date date,
  asset_types text[] NOT NULL DEFAULT '{}',
  description text NOT NULL,
  helpful_resources text,
  approval_needed text,
  priority_level text,

  -- ─── Submission provenance ──────────────────────────────────────────
  submitted_by_slack_id text,
  submitted_by_display_name text,
  submitted_at timestamptz NOT NULL DEFAULT now(),
  origin text NOT NULL CHECK (origin IN ('slack_flag', 'admin_create')),

  -- ─── Juju metadata (only populated when origin='slack_flag') ────────
  -- parent_feedback_id is FK to juju_feedback.id but on delete we just null
  -- it out so admin-side history isn't lost if a feedback row is later
  -- expunged. verified_answer + original_question are snapshots so the
  -- admin row renders correctly even after edits to the parent.
  parent_feedback_id uuid REFERENCES public.juju_feedback(id) ON DELETE SET NULL,
  category text,
  thread_permalink text,
  verified_answer text,
  original_question text,

  -- ─── Education team workflow (filled in admin UI after submission) ──
  owner text,
  task_status text NOT NULL DEFAULT 'waiting' CHECK (task_status IN (
    'waiting', 'in_progress', 'completed', 'rejected'
  )),
  follow_up_with_requestor boolean NOT NULL DEFAULT false,
  notes text,

  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ─── Indexes ──────────────────────────────────────────────────────────
-- status_idx: queue view sorted by recency, filtered by status
-- origin_idx: lets us split the table view into "from Slack" vs "admin-created"
-- parent_idx: partial; supports lookups from the parent feedback row
CREATE INDEX IF NOT EXISTS juju_doc_requests_status_idx
  ON public.juju_doc_requests (task_status, submitted_at DESC);

CREATE INDEX IF NOT EXISTS juju_doc_requests_origin_idx
  ON public.juju_doc_requests (origin);

CREATE INDEX IF NOT EXISTS juju_doc_requests_parent_idx
  ON public.juju_doc_requests (parent_feedback_id)
  WHERE parent_feedback_id IS NOT NULL;

-- ─── updated_at trigger ───────────────────────────────────────────────
-- Table-scoped function (matches the pattern from 0008_app_config.sql).
CREATE OR REPLACE FUNCTION public.juju_doc_requests_touch_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS juju_doc_requests_set_updated_at ON public.juju_doc_requests;
CREATE TRIGGER juju_doc_requests_set_updated_at
  BEFORE UPDATE ON public.juju_doc_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.juju_doc_requests_touch_updated_at();

-- ─── RLS ──────────────────────────────────────────────────────────────
-- v1: anon role gets full access. Admin UI is gated by Vercel HTTP Basic
-- Auth at the edge middleware, so all callers reaching Supabase are already
-- authenticated admins. Bot uses service_role and bypasses RLS regardless.
-- When per-user RBAC arrives, replace this with role-aware policies.
ALTER TABLE public.juju_doc_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS juju_doc_requests_anon_all ON public.juju_doc_requests;
CREATE POLICY juju_doc_requests_anon_all
  ON public.juju_doc_requests
  FOR ALL
  TO anon
  USING (true)
  WITH CHECK (true);
