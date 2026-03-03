-- ============================================
-- PRO PROFILES + CERTIFICATIONS + STORAGE
-- ============================================
-- Persists rates, profile photo path, business logo path, and certifications with file uploads.
-- Safe to re-run (idempotent).

-- ============================================
-- 1. PRO_PROFILES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.pro_profiles (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  hourly_rate NUMERIC,
  starting_rate NUMERIC,
  rate_unit TEXT DEFAULT 'hour',
  profile_photo_path TEXT,
  business_logo_path TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.pro_profiles IS 'Pro-specific profile: rates and storage paths for avatar/logo';
COMMENT ON COLUMN public.pro_profiles.profile_photo_path IS 'Storage path in avatars bucket, e.g. userId/profile.jpg';
COMMENT ON COLUMN public.pro_profiles.business_logo_path IS 'Storage path in logos bucket, e.g. userId/logo.jpg';

-- ============================================
-- 2. PRO_CERTIFICATIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.pro_certifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  issuer TEXT,
  issue_date DATE,
  expires_at DATE,
  file_path TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pro_certifications_user ON public.pro_certifications(user_id);

COMMENT ON TABLE public.pro_certifications IS 'Pro certifications with optional file upload';
COMMENT ON COLUMN public.pro_certifications.file_path IS 'Storage path in certifications bucket';

-- ============================================
-- 3. RLS POLICIES
-- ============================================

ALTER TABLE public.pro_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pro_certifications ENABLE ROW LEVEL SECURITY;

-- pro_profiles: user can only access their own row
DROP POLICY IF EXISTS "Users select own pro_profile" ON public.pro_profiles;
CREATE POLICY "Users select own pro_profile" ON public.pro_profiles
  FOR SELECT TO authenticated USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users insert own pro_profile" ON public.pro_profiles;
CREATE POLICY "Users insert own pro_profile" ON public.pro_profiles
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users update own pro_profile" ON public.pro_profiles;
CREATE POLICY "Users update own pro_profile" ON public.pro_profiles
  FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- pro_certifications: user can only access their own rows
DROP POLICY IF EXISTS "Users select own pro_certifications" ON public.pro_certifications;
CREATE POLICY "Users select own pro_certifications" ON public.pro_certifications
  FOR SELECT TO authenticated USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users insert own pro_certifications" ON public.pro_certifications;
CREATE POLICY "Users insert own pro_certifications" ON public.pro_certifications
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users update own pro_certifications" ON public.pro_certifications;
CREATE POLICY "Users update own pro_certifications" ON public.pro_certifications
  FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users delete own pro_certifications" ON public.pro_certifications;
CREATE POLICY "Users delete own pro_certifications" ON public.pro_certifications
  FOR DELETE TO authenticated USING (user_id = auth.uid());

-- ============================================
-- 4. UPDATED_AT TRIGGER
-- ============================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_updated_at_column') THEN
    CREATE OR REPLACE FUNCTION public.update_updated_at_column()
    RETURNS TRIGGER AS $fn$
    BEGIN
      NEW.updated_at = now();
      RETURN NEW;
    END;
    $fn$ LANGUAGE plpgsql;
  END IF;
END $$;

DROP TRIGGER IF EXISTS pro_profiles_updated_at ON public.pro_profiles;
CREATE TRIGGER pro_profiles_updated_at
  BEFORE UPDATE ON public.pro_profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- 5. STORAGE BUCKETS
-- ============================================

-- avatars bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- logos bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('logos', 'logos', true)
ON CONFLICT (id) DO NOTHING;

-- certifications bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('certifications', 'certifications', true)
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- 6. STORAGE POLICIES (avatars)
-- ============================================
DROP POLICY IF EXISTS "Public read avatars" ON storage.objects;
CREATE POLICY "Public read avatars" ON storage.objects
  FOR SELECT USING (bucket_id = 'avatars');

DROP POLICY IF EXISTS "Users upload own avatars" ON storage.objects;
CREATE POLICY "Users upload own avatars" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "Users update own avatars" ON storage.objects;
CREATE POLICY "Users update own avatars" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text)
  WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "Users delete own avatars" ON storage.objects;
CREATE POLICY "Users delete own avatars" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

-- ============================================
-- 7. STORAGE POLICIES (logos)
-- ============================================
DROP POLICY IF EXISTS "Public read logos" ON storage.objects;
CREATE POLICY "Public read logos" ON storage.objects
  FOR SELECT USING (bucket_id = 'logos');

DROP POLICY IF EXISTS "Users upload own logos" ON storage.objects;
CREATE POLICY "Users upload own logos" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'logos'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "Users update own logos" ON storage.objects;
CREATE POLICY "Users update own logos" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'logos' AND (storage.foldername(name))[1] = auth.uid()::text)
  WITH CHECK (bucket_id = 'logos' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "Users delete own logos" ON storage.objects;
CREATE POLICY "Users delete own logos" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'logos' AND (storage.foldername(name))[1] = auth.uid()::text);

-- ============================================
-- 8. STORAGE POLICIES (certifications)
-- ============================================
DROP POLICY IF EXISTS "Public read certifications" ON storage.objects;
CREATE POLICY "Public read certifications" ON storage.objects
  FOR SELECT USING (bucket_id = 'certifications');

DROP POLICY IF EXISTS "Users upload own certifications" ON storage.objects;
CREATE POLICY "Users upload own certifications" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'certifications'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "Users update own certifications" ON storage.objects;
CREATE POLICY "Users update own certifications" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'certifications' AND (storage.foldername(name))[1] = auth.uid()::text)
  WITH CHECK (bucket_id = 'certifications' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "Users delete own certifications" ON storage.objects;
CREATE POLICY "Users delete own certifications" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'certifications' AND (storage.foldername(name))[1] = auth.uid()::text);
