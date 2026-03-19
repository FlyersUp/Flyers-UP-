-- ============================================
-- BUG REPORTS TABLE
-- ============================================
-- User-submitted bug reports from error pages and Report Issue flows.
-- Designed for admin support tooling and triage.
-- ============================================

CREATE TABLE IF NOT EXISTS public.bug_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  user_id uuid NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  role text NULL CHECK (role IN ('customer', 'pro', 'admin')),
  pathname text NULL,
  full_url text NULL,
  error_type text NULL,
  error_message text NULL,
  error_digest text NULL,
  stack text NULL,
  user_note text NULL,
  screenshot_url text NULL,
  user_agent text NULL,
  viewport text NULL,
  referrer text NULL,
  app_version text NULL,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'closed'))
);

CREATE INDEX IF NOT EXISTS bug_reports_created_at_idx ON public.bug_reports (created_at DESC);
CREATE INDEX IF NOT EXISTS bug_reports_user_id_idx ON public.bug_reports (user_id);
CREATE INDEX IF NOT EXISTS bug_reports_status_idx ON public.bug_reports (status);

ALTER TABLE public.bug_reports ENABLE ROW LEVEL SECURITY;

-- Reports are inserted via createAdminSupabaseClient (service_role), which bypasses RLS.
-- No policies needed for anon/authenticated - they cannot access this table directly.
