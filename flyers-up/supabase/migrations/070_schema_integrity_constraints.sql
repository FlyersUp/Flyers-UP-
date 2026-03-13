-- ============================================
-- SCHEMA INTEGRITY: Constraints and defaults
-- ============================================
-- Add CHECK constraints for profiles.role
-- Ensure cents fields have sensible defaults
-- ============================================

-- PROFILES: role must be valid enum (schema may have CHECK; ensure it)
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_role_check
  CHECK (role IS NULL OR role IN ('customer', 'pro', 'admin'));

-- JOB_COMPLETIONS: after_photo_urls should not be empty for payout eligibility
-- (enforced in release-payouts cron; this is a soft guard)
COMMENT ON COLUMN public.job_completions.after_photo_urls IS 'Required 2+ valid URLs for payout release; no placeholders';
