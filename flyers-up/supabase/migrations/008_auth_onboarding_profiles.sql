-- ============================================
-- MIGRATION: Auth + onboarding profile scaffolding
-- ============================================
-- Aligns Supabase schema with onboarding flow requirements:
-- - profiles.role becomes nullable (so we can force role selection)
-- - add onboarding fields: first_name, email, zip_code, onboarding_step, updated_at
-- - tighten profiles RLS (remove overly-broad insert policy)
-- - add minimal pro onboarding fields to service_pros: secondary_category_id, service_area_zip
--
-- Safe to re-run (idempotent where possible).
-- ============================================

-- Ensure updated_at trigger function exists
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_updated_at_column') THEN
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

-- ============================================
-- PROFILES: add columns + allow role to be NULL
-- ============================================
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS first_name text,
  ADD COLUMN IF NOT EXISTS email text,
  ADD COLUMN IF NOT EXISTS zip_code text,
  ADD COLUMN IF NOT EXISTS onboarding_step text,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

-- Make role nullable + remove default (only if currently NOT NULL / has default)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'profiles'
      AND column_name = 'role'
      AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE public.profiles ALTER COLUMN role DROP NOT NULL;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'profiles'
      AND column_name = 'role'
      AND column_default IS NOT NULL
  ) THEN
    ALTER TABLE public.profiles ALTER COLUMN role DROP DEFAULT;
  END IF;
END $$;

-- updated_at trigger
DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- Tighten PROFILES RLS policies (RLS already enabled in schema.sql)
-- ============================================
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Remove overly-broad insert policy from schema.sql
DROP POLICY IF EXISTS "Service role can insert profiles" ON public.profiles;

DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Admin read-all (optional, used for internal support tooling)
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
CREATE POLICY "Admins can view all profiles"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

-- ============================================
-- SERVICE_PROS: add onboarding fields (optional table already exists)
-- ============================================
ALTER TABLE public.service_pros
  ADD COLUMN IF NOT EXISTS secondary_category_id uuid REFERENCES public.service_categories(id),
  ADD COLUMN IF NOT EXISTS service_area_zip text;


