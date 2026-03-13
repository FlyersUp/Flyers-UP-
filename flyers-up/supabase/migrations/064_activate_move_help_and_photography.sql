-- Activate move-help and photography so all occupations (mover, photographer, videographer) work in pro onboarding.
-- Phase 1 previously limited to 5 services; expanding to support full occupation list.

UPDATE public.services SET is_active = true WHERE slug IN ('move-help', 'photography');
UPDATE public.service_categories SET is_active_phase1 = true WHERE slug IN ('move-help', 'photography');
