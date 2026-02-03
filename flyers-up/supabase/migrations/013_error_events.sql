-- ============================================
-- MIGRATION: Error events (client/server reporting)
-- ============================================
-- Stores crash/error reports so you can triage issues quickly.
-- Safe to re-run (idempotent).

CREATE TABLE IF NOT EXISTS public.error_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  source text NOT NULL CHECK (source IN ('client', 'server')),
  severity text NOT NULL DEFAULT 'error' CHECK (severity IN ('debug','info','warn','error','fatal')),
  message text NOT NULL,
  stack text NULL,
  url text NULL,
  route text NULL,
  release text NULL,
  user_id uuid NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  user_agent text NULL,
  ip_address text NULL,
  meta jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS error_events_created_at_idx ON public.error_events (created_at DESC);
CREATE INDEX IF NOT EXISTS error_events_user_id_idx ON public.error_events (user_id);
CREATE INDEX IF NOT EXISTS error_events_source_idx ON public.error_events (source);
CREATE INDEX IF NOT EXISTS error_events_severity_idx ON public.error_events (severity);

ALTER TABLE public.error_events ENABLE ROW LEVEL SECURITY;

-- No public reads.
DROP POLICY IF EXISTS "Users can view own error events" ON public.error_events;
CREATE POLICY "Users can view own error events"
  ON public.error_events
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Allow users to insert their own error events (optional; API route may also insert via service role).
DROP POLICY IF EXISTS "Users can insert own error events" ON public.error_events;
CREATE POLICY "Users can insert own error events"
  ON public.error_events
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

