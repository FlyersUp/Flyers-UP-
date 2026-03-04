-- ============================================
-- TRUST & SAFETY + SUPPORT TICKETS
-- ============================================
-- Pro safety compliance: guidelines, insurance, background check, account standing
-- Support tickets for help hub
-- Safe to re-run (idempotent)

-- ============================================
-- 1. PRO_SAFETY_COMPLIANCE_SETTINGS
-- ============================================
CREATE TABLE IF NOT EXISTS public.pro_safety_compliance_settings (
  pro_user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  guidelines_acknowledged BOOLEAN NOT NULL DEFAULT false,
  guidelines_accepted_at TIMESTAMPTZ,
  insurance_document_url TEXT,
  insurance_doc_path TEXT,
  insurance_expires_at DATE,
  insurance_provider TEXT,
  background_check_status TEXT NOT NULL DEFAULT 'not_started',
  warning_count INT NOT NULL DEFAULT 0,
  strike_count INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.pro_safety_compliance_settings IS 'Pro trust & safety: guidelines, insurance, background check, standing';

ALTER TABLE public.pro_safety_compliance_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Pros select own safety compliance" ON public.pro_safety_compliance_settings;
CREATE POLICY "Pros select own safety compliance" ON public.pro_safety_compliance_settings
  FOR SELECT TO authenticated USING (pro_user_id = auth.uid());

DROP POLICY IF EXISTS "Pros insert own safety compliance" ON public.pro_safety_compliance_settings;
CREATE POLICY "Pros insert own safety compliance" ON public.pro_safety_compliance_settings
  FOR INSERT TO authenticated WITH CHECK (pro_user_id = auth.uid());

DROP POLICY IF EXISTS "Pros update own safety compliance" ON public.pro_safety_compliance_settings;
CREATE POLICY "Pros update own safety compliance" ON public.pro_safety_compliance_settings
  FOR UPDATE TO authenticated USING (pro_user_id = auth.uid()) WITH CHECK (pro_user_id = auth.uid());

-- Add new columns if table already existed (must run before COMMENT ON COLUMN)
ALTER TABLE public.pro_safety_compliance_settings
  ADD COLUMN IF NOT EXISTS guidelines_accepted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS insurance_doc_path TEXT,
  ADD COLUMN IF NOT EXISTS insurance_expires_at DATE,
  ADD COLUMN IF NOT EXISTS insurance_provider TEXT,
  ADD COLUMN IF NOT EXISTS background_check_status TEXT DEFAULT 'not_started',
  ADD COLUMN IF NOT EXISTS warning_count INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS strike_count INT DEFAULT 0;

COMMENT ON COLUMN public.pro_safety_compliance_settings.guidelines_accepted_at IS 'When pro acknowledged community guidelines';
COMMENT ON COLUMN public.pro_safety_compliance_settings.insurance_doc_path IS 'Storage path in insurance_docs bucket';
COMMENT ON COLUMN public.pro_safety_compliance_settings.background_check_status IS 'not_started | pending | verified';

-- ============================================
-- 2. SUPPORT_TICKETS
-- ============================================
CREATE TABLE IF NOT EXISTS public.support_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subject TEXT NOT NULL,
  message TEXT NOT NULL,
  include_diagnostics BOOLEAN NOT NULL DEFAULT true,
  diagnostics JSONB,
  status TEXT NOT NULL DEFAULT 'open',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_support_tickets_user ON public.support_tickets(user_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_created ON public.support_tickets(created_at DESC);

COMMENT ON TABLE public.support_tickets IS 'User support messages';

ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users insert own support tickets" ON public.support_tickets;
CREATE POLICY "Users insert own support tickets" ON public.support_tickets
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users select own support tickets" ON public.support_tickets;
CREATE POLICY "Users select own support tickets" ON public.support_tickets
  FOR SELECT TO authenticated USING (user_id = auth.uid());

-- ============================================
-- 3. INSURANCE_DOCS STORAGE BUCKET
-- ============================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('insurance_docs', 'insurance_docs', false)
ON CONFLICT (id) DO NOTHING;

-- Policy: users can upload/read only their own prefix (userId/filename)
DROP POLICY IF EXISTS "Insurance docs upload own" ON storage.objects;
CREATE POLICY "Insurance docs upload own" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'insurance_docs' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "Insurance docs select own" ON storage.objects;
CREATE POLICY "Insurance docs select own" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'insurance_docs' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "Insurance docs update own" ON storage.objects;
CREATE POLICY "Insurance docs update own" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'insurance_docs' AND (storage.foldername(name))[1] = auth.uid()::text)
  WITH CHECK (bucket_id = 'insurance_docs' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "Insurance docs delete own" ON storage.objects;
CREATE POLICY "Insurance docs delete own" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'insurance_docs' AND (storage.foldername(name))[1] = auth.uid()::text);
