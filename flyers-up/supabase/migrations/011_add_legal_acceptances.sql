-- ============================================
-- MIGRATION: Legal acceptances (Terms/Privacy)
-- ============================================
-- Stores acceptance events for legal versions (e.g., Terms v2026-01-27).
-- Safe to re-run (idempotent).

CREATE TABLE IF NOT EXISTS public.legal_acceptances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  terms_version text NOT NULL,
  accepted_at timestamptz NOT NULL DEFAULT now(),
  ip_address text NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- One acceptance per user per version
CREATE UNIQUE INDEX IF NOT EXISTS legal_acceptances_user_version_unique
  ON public.legal_acceptances (user_id, terms_version);

CREATE INDEX IF NOT EXISTS legal_acceptances_user_id_idx
  ON public.legal_acceptances (user_id);

ALTER TABLE public.legal_acceptances ENABLE ROW LEVEL SECURITY;

-- Users can insert their own acceptance record
DROP POLICY IF EXISTS "Users can insert own legal acceptance" ON public.legal_acceptances;
CREATE POLICY "Users can insert own legal acceptance"
  ON public.legal_acceptances
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Users can view their own acceptance records
DROP POLICY IF EXISTS "Users can view own legal acceptances" ON public.legal_acceptances;
CREATE POLICY "Users can view own legal acceptances"
  ON public.legal_acceptances
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

