-- ============================================
-- Backfill in-app guidance onboarding completion
-- ============================================
-- Users who finished platform onboarding (profiles.onboarding_step cleared) but never
-- had user_app_preferences guidance timestamps were treated as "not completed" and saw
-- the Welcome / How it works modal on many routes. Mark guidance complete for them.
-- ============================================

INSERT INTO public.user_app_preferences (
  user_id,
  dark_mode,
  distance_units,
  default_map_view,
  location_enabled,
  onboarding_completed_at,
  updated_at
)
SELECT
  p.id,
  false,
  'miles',
  'map',
  true,
  now(),
  now()
FROM public.profiles p
WHERE p.role IS NOT NULL
  AND (p.onboarding_step IS NULL OR btrim(p.onboarding_step) = '')
  AND NOT EXISTS (
    SELECT 1 FROM public.user_app_preferences u WHERE u.user_id = p.id
  )
ON CONFLICT (user_id) DO NOTHING;

UPDATE public.user_app_preferences u
SET
  onboarding_completed_at = COALESCE(u.onboarding_completed_at, now()),
  updated_at = now()
FROM public.profiles p
WHERE u.user_id = p.id
  AND p.role IS NOT NULL
  AND (p.onboarding_step IS NULL OR btrim(p.onboarding_step) = '')
  AND u.onboarding_completed_at IS NULL
  AND u.onboarding_skipped_at IS NULL;
