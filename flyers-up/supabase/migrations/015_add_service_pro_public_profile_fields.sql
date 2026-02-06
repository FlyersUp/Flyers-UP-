-- ============================================
-- MIGRATION: Add missing service_pros public profile fields
-- ============================================
-- The app expects these fields to persist on public.service_pros:
-- - logo_url (pro identity)
-- - service_descriptions (business profile)
-- - before_after_photos (business profile)
--
-- Safe to re-run (idempotent).

ALTER TABLE public.service_pros
  ADD COLUMN IF NOT EXISTS logo_url text,
  ADD COLUMN IF NOT EXISTS service_descriptions text,
  ADD COLUMN IF NOT EXISTS before_after_photos jsonb NOT NULL DEFAULT '[]'::jsonb;

COMMENT ON COLUMN public.service_pros.before_after_photos IS 'JSON array of before/after photo URLs';

