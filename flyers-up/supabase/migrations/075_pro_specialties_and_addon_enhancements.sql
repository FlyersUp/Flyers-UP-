-- ============================================
-- PRO SPECIALTIES + SERVICE ADDON ENHANCEMENTS
-- ============================================
-- 1) Create pro_specialties table (max 8 per pro, label max 40 chars)
-- 2) Add description (nullable) to service_addons
-- 3) Add occupation_id, service_type_id (nullable) to service_addons for future flexibility
-- 4) Add-on constraints: no duplicate names per pro (case-insensitive)
-- Preserves service_category for backward compatibility.
-- ============================================

-- 1) PRO SPECIALTIES
CREATE TABLE IF NOT EXISTS public.pro_specialties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pro_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  normalized_label TEXT NOT NULL,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(pro_id, normalized_label)
);

CREATE INDEX IF NOT EXISTS idx_pro_specialties_pro ON public.pro_specialties(pro_id);
CREATE INDEX IF NOT EXISTS idx_pro_specialties_normalized ON public.pro_specialties(pro_id, normalized_label);

ALTER TABLE public.pro_specialties ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Pros can manage own pro_specialties" ON public.pro_specialties;
CREATE POLICY "Pros can manage own pro_specialties" ON public.pro_specialties
  FOR ALL TO authenticated
  USING (pro_id IN (SELECT id FROM public.profiles WHERE id = auth.uid()))
  WITH CHECK (pro_id IN (SELECT id FROM public.profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS "Public read pro_specialties" ON public.pro_specialties;
CREATE POLICY "Public read pro_specialties" ON public.pro_specialties
  FOR SELECT TO anon, authenticated
  USING (active = true);

-- Allow pros to read their own inactive specialties (management)
DROP POLICY IF EXISTS "Pros can view own pro_specialties" ON public.pro_specialties;
CREATE POLICY "Pros can view own pro_specialties" ON public.pro_specialties
  FOR SELECT TO authenticated
  USING (pro_id IN (SELECT id FROM public.profiles WHERE id = auth.uid()));

COMMENT ON TABLE public.pro_specialties IS 'Pro-specific specialties; max 8 per pro, label max 40 chars, case-insensitive dedupe';

-- 2) ADD DESCRIPTION TO SERVICE_ADDONS
ALTER TABLE public.service_addons ADD COLUMN IF NOT EXISTS description TEXT;

-- 3) ADD OCCUPATION_ID, SERVICE_TYPE_ID (nullable) FOR FUTURE FLEXIBILITY
ALTER TABLE public.service_addons ADD COLUMN IF NOT EXISTS occupation_id UUID REFERENCES public.occupations(id) ON DELETE SET NULL;
ALTER TABLE public.service_addons ADD COLUMN IF NOT EXISTS service_type_id UUID REFERENCES public.occupation_services(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_service_addons_occupation ON public.service_addons(occupation_id);
CREATE INDEX IF NOT EXISTS idx_service_addons_service_type ON public.service_addons(service_type_id);

-- Make service_category nullable for future; keep NOT NULL for backward compat (existing rows)
-- We do NOT alter NOT NULL to avoid breaking existing code. New addons can still use it.

-- 4) ADD-ON: NO DUPLICATE NAMES PER PRO (case-insensitive) via trigger
CREATE OR REPLACE FUNCTION enforce_addon_title_unique_per_pro()
RETURNS TRIGGER AS $$
DECLARE
  existing_id UUID;
  norm_title TEXT;
BEGIN
  norm_title := lower(trim(NEW.title));
  IF norm_title = '' THEN
    RAISE EXCEPTION 'Add-on title cannot be empty.';
  END IF;

  SELECT id INTO existing_id
  FROM public.service_addons
  WHERE pro_id = NEW.pro_id
    AND lower(trim(title)) = norm_title
    AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
  LIMIT 1;

  IF existing_id IS NOT NULL THEN
    RAISE EXCEPTION 'You already have an add-on with this name.';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS enforce_addon_title_unique_trigger ON public.service_addons;
CREATE TRIGGER enforce_addon_title_unique_trigger
  BEFORE INSERT OR UPDATE ON public.service_addons
  FOR EACH ROW
  EXECUTE FUNCTION enforce_addon_title_unique_per_pro();

-- 5) SPECIALTY CONSTRAINTS VIA TRIGGER: max 8 per pro, label max 40 chars
CREATE OR REPLACE FUNCTION enforce_pro_specialties_limits()
RETURNS TRIGGER AS $$
DECLARE
  cnt INTEGER;
  trimmed_label TEXT;
  norm_label TEXT;
BEGIN
  -- Trim and validate length (max 40 chars)
  trimmed_label := trim(NEW.label);
  IF length(trimmed_label) > 40 THEN
    RAISE EXCEPTION 'Specialty label must be 40 characters or less.';
  END IF;
  IF trimmed_label = '' THEN
    RAISE EXCEPTION 'Specialty label cannot be empty.';
  END IF;

  -- Normalize for dedupe: lowercase, trim
  norm_label := lower(trimmed_label);
  NEW.normalized_label := norm_label;
  NEW.label := trimmed_label;

  -- Enforce max 8 per pro
  IF TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND (OLD.pro_id != NEW.pro_id OR OLD.normalized_label != norm_label)) THEN
    SELECT COUNT(*) INTO cnt
    FROM public.pro_specialties
    WHERE pro_id = NEW.pro_id
      AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid);

    IF cnt >= 8 THEN
      RAISE EXCEPTION 'Maximum 8 specialties allowed per pro.';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS enforce_pro_specialties_limits_trigger ON public.pro_specialties;
CREATE TRIGGER enforce_pro_specialties_limits_trigger
  BEFORE INSERT OR UPDATE ON public.pro_specialties
  FOR EACH ROW
  EXECUTE FUNCTION enforce_pro_specialties_limits();
