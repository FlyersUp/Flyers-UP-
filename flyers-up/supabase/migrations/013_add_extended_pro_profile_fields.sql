-- ============================================
-- MIGRATION: Persist extended pro profile fields
-- ============================================
-- Purpose:
-- - Move "extended" pro profile data out of localStorage and into Supabase.
-- - Keep schema flexible with JSONB for arrays/structured objects.
--
-- Safe to re-run (idempotent).

ALTER TABLE public.service_pros
  -- Pro onboarding fields (expected by app)
  ADD COLUMN IF NOT EXISTS secondary_category_id uuid REFERENCES public.service_categories(id),
  ADD COLUMN IF NOT EXISTS service_area_zip text,
  -- Extended profile fields (used in /pro/profile and /pro/settings/business)
  ADD COLUMN IF NOT EXISTS years_experience integer,
  ADD COLUMN IF NOT EXISTS services_offered text[] NOT NULL DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS certifications jsonb NOT NULL DEFAULT '[]'::jsonb,
  -- "Services" list (name + price) used in My Business UI
  ADD COLUMN IF NOT EXISTS service_types jsonb NOT NULL DEFAULT '[]'::jsonb;

COMMENT ON COLUMN public.service_pros.years_experience IS 'Years of experience (pro-entered)';
COMMENT ON COLUMN public.service_pros.services_offered IS 'List of service slugs the pro offers (UI-managed)';
COMMENT ON COLUMN public.service_pros.certifications IS 'JSON array of verification/credential strings (UI-managed)';
COMMENT ON COLUMN public.service_pros.service_types IS 'JSON array of service objects (e.g. [{name, price, id}])';

