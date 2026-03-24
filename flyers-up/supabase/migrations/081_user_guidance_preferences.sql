-- ============================================
-- USER GUIDANCE PREFERENCES (extend user_app_preferences)
-- ============================================
-- Adds onboarding + hint state to existing user_app_preferences.
-- Single source of truth; no second table.
-- ============================================

-- Rollback: drop separate table if it was created in a previous run
DROP TABLE IF EXISTS public.user_guidance_preferences CASCADE;

ALTER TABLE public.user_app_preferences
  ADD COLUMN IF NOT EXISTS onboarding_completed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS onboarding_skipped_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS onboarding_version INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS dismissed_hint_keys TEXT[] NOT NULL DEFAULT '{}';

COMMENT ON COLUMN public.user_app_preferences.onboarding_version IS 'Onboarding version; re-show if increased';
COMMENT ON COLUMN public.user_app_preferences.dismissed_hint_keys IS 'Contextual hint keys the user has dismissed';
