-- ============================================
-- MIGRATION: Tax & Payouts compliance scaffolding (SSN/ITIN type only)
-- ============================================
-- Goals:
-- - Store ONLY tax ID TYPE and compliance status (never store raw SSN/ITIN)
-- - Store Stripe Connect account reference + payout risk controls fields
-- - Add feature flag scaffolding (DB) for gated rollout
-- - RLS: pro can read their own status; admin can read/write all; no public read
--
-- Safe to re-run (idempotent where possible).
-- ============================================

-- ============================================
-- 1) ENUM TYPES
-- ============================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'tax_id_type') THEN
    CREATE TYPE public.tax_id_type AS ENUM ('SSN', 'ITIN', 'OTHER');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'tax_forms_status') THEN
    CREATE TYPE public.tax_forms_status AS ENUM ('not_started', 'pending', 'verified', 'rejected');
  END IF;
END $$;

-- ============================================
-- 2) PRO TAX PROFILE (NO RAW TAX ID VALUES)
-- ============================================
CREATE TABLE IF NOT EXISTS public.pro_tax_profiles (
  pro_user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  tax_id_type public.tax_id_type NULL,
  tax_forms_status public.tax_forms_status NOT NULL DEFAULT 'not_started',
  stripe_account_id text NULL,
  payouts_hold_days int NOT NULL DEFAULT 0,
  payouts_on_hold boolean NOT NULL DEFAULT false,
  last_tax_form_submitted_at timestamptz NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  -- Guardrail: tax ID values must NEVER be stored here.
  CONSTRAINT pro_tax_profiles_no_tax_id_value CHECK (true)
);

CREATE INDEX IF NOT EXISTS idx_pro_tax_profiles_tax_forms_status ON public.pro_tax_profiles(tax_forms_status);
CREATE INDEX IF NOT EXISTS idx_pro_tax_profiles_payouts_on_hold ON public.pro_tax_profiles(payouts_on_hold);

-- Keep updated_at current
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc WHERE proname = 'update_updated_at_column'
  ) THEN
    -- If schema.sql hasn't been applied yet, this function may not exist. Create a minimal one.
    CREATE OR REPLACE FUNCTION public.update_updated_at_column()
    RETURNS trigger
    LANGUAGE plpgsql
    AS $fn$
    BEGIN
      NEW.updated_at = now();
      RETURN NEW;
    END;
    $fn$;
  END IF;
END $$;

DROP TRIGGER IF EXISTS update_pro_tax_profiles_updated_at ON public.pro_tax_profiles;
CREATE TRIGGER update_pro_tax_profiles_updated_at
  BEFORE UPDATE ON public.pro_tax_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.pro_tax_profiles ENABLE ROW LEVEL SECURITY;

-- Helper expression: admin check via profiles.role = 'admin'
-- (Inline EXISTS to avoid dependencies on custom SQL functions)

DROP POLICY IF EXISTS "Pros can view own tax profile" ON public.pro_tax_profiles;
CREATE POLICY "Pros can view own tax profile"
  ON public.pro_tax_profiles
  FOR SELECT
  TO authenticated
  USING (pro_user_id = auth.uid());

DROP POLICY IF EXISTS "Admins can view all tax profiles" ON public.pro_tax_profiles;
CREATE POLICY "Admins can view all tax profiles"
  ON public.pro_tax_profiles
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

-- Admin-only writes (status + payout holds are compliance-controlled)
DROP POLICY IF EXISTS "Admins can manage all tax profiles" ON public.pro_tax_profiles;
CREATE POLICY "Admins can manage all tax profiles"
  ON public.pro_tax_profiles
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

-- Controlled pro action: pro can set their own tax_id_type via a SECURITY DEFINER function.
-- This avoids granting broad UPDATE rights that could let a pro mark themselves 'verified'.
CREATE OR REPLACE FUNCTION public.upsert_my_tax_id_type(new_tax_id_type public.tax_id_type)
RETURNS public.pro_tax_profiles
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid;
  existing public.pro_tax_profiles;
BEGIN
  uid := auth.uid();
  IF uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT * INTO existing FROM public.pro_tax_profiles WHERE pro_user_id = uid;

  IF NOT FOUND THEN
    INSERT INTO public.pro_tax_profiles (pro_user_id, tax_id_type, tax_forms_status)
    VALUES (uid, new_tax_id_type, 'pending')
    RETURNING * INTO existing;
    RETURN existing;
  END IF;

  -- If already verified, changing type requires review again -> set to pending.
  UPDATE public.pro_tax_profiles
  SET
    tax_id_type = new_tax_id_type,
    tax_forms_status = CASE
      WHEN existing.tax_forms_status = 'verified' THEN 'pending'
      ELSE existing.tax_forms_status
    END
  WHERE pro_user_id = uid
  RETURNING * INTO existing;

  RETURN existing;
END;
$$;

REVOKE ALL ON FUNCTION public.upsert_my_tax_id_type(public.tax_id_type) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.upsert_my_tax_id_type(public.tax_id_type) TO authenticated;

-- ============================================
-- 3) FEATURE FLAGS (DB)
-- ============================================
CREATE TABLE IF NOT EXISTS public.feature_flags (
  key text PRIMARY KEY,
  enabled boolean NOT NULL DEFAULT false,
  description text NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS update_feature_flags_updated_at ON public.feature_flags;
CREATE TRIGGER update_feature_flags_updated_at
  BEFORE UPDATE ON public.feature_flags
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.feature_flags ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can manage feature flags" ON public.feature_flags;
CREATE POLICY "Admins can manage feature flags"
  ON public.feature_flags
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

-- Seed the flag key (default OFF)
INSERT INTO public.feature_flags (key, enabled, description)
VALUES (
  'FEATURE_ITIN_ONBOARDING',
  false,
  'Enable ITIN option for pro tax identification type selection (no raw ID stored).'
)
ON CONFLICT (key) DO NOTHING;


