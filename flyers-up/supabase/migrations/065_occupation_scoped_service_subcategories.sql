-- ============================================
-- Occupation-scoped service subcategories
-- ============================================
-- Add occupation_id to service_subcategories so services are strictly tied to occupations.
-- Sync occupation_services into service_subcategories for each occupation.
-- ============================================

-- 1) Add occupation_id column
ALTER TABLE public.service_subcategories
  ADD COLUMN IF NOT EXISTS occupation_id uuid REFERENCES public.occupations(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_service_subcategories_occupation ON public.service_subcategories(occupation_id) WHERE occupation_id IS NOT NULL;

-- 2) Update unique constraint: legacy rows (occupation_id IS NULL) keep (service_id, slug); new rows use (service_id, occupation_id, slug)
ALTER TABLE public.service_subcategories DROP CONSTRAINT IF EXISTS service_subcategories_service_id_slug_key;

-- Legacy: (service_id, slug) unique when occupation_id is null
CREATE UNIQUE INDEX IF NOT EXISTS idx_service_subcategories_legacy_unique
  ON public.service_subcategories(service_id, slug) WHERE occupation_id IS NULL;

-- Occupation-scoped: (service_id, occupation_id, slug) unique
CREATE UNIQUE INDEX IF NOT EXISTS idx_service_subcategories_occupation_unique
  ON public.service_subcategories(service_id, occupation_id, slug) WHERE occupation_id IS NOT NULL;

-- 3) Insert service_subcategories from occupation_services for each occupation
-- Mapping: occupation slug -> service slug (from OCCUPATION_TO_SERVICE_SLUG)
-- Slug from name: lower, replace non-alphanumeric with hyphen
INSERT INTO public.service_subcategories (service_id, occupation_id, slug, name, description, requires_license, sort_order, is_active)
SELECT
  s.id,
  o.id,
  lower(regexp_replace(regexp_replace(os.name, '[^a-zA-Z0-9\s-]', '', 'g'), '\s+', '-', 'g')),
  os.name,
  os.description,
  false,
  os.sort_order,
  true
FROM public.occupation_services os
JOIN public.occupations o ON o.id = os.occupation_id
JOIN public.services s ON s.slug = CASE o.slug
  WHEN 'cleaner' THEN 'cleaning'
  WHEN 'handyman' THEN 'handyman'
  WHEN 'tutor' THEN 'trainer-tutor'
  WHEN 'dog-walker' THEN 'pet-care'
  WHEN 'event-planner' THEN 'event-organizer'
  WHEN 'mover' THEN 'move-help'
  WHEN 'personal-trainer' THEN 'trainer-tutor'
  WHEN 'photographer' THEN 'photography'
  WHEN 'videographer' THEN 'photography'
  WHEN 'dj' THEN 'event-organizer'
  WHEN 'chef' THEN 'event-organizer'
  WHEN 'makeup-artist' THEN 'event-organizer'
  WHEN 'barber' THEN 'handyman'
  WHEN 'mechanic' THEN 'handyman'
  WHEN 'it-technician' THEN 'handyman'
  WHEN 'landscaper' THEN 'handyman'
  WHEN 'snow-removal' THEN 'handyman'
  WHEN 'painter' THEN 'handyman'
  WHEN 'car-detailer' THEN 'handyman'
  WHEN 'home-organizer' THEN 'cleaning'
  ELSE 'handyman'
END AND s.is_active
ON CONFLICT (service_id, occupation_id, slug) WHERE occupation_id IS NOT NULL
DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, sort_order = EXCLUDED.sort_order, is_active = EXCLUDED.is_active;

COMMENT ON COLUMN public.service_subcategories.occupation_id IS 'When set, this subcategory belongs to a specific occupation. Null for legacy subcategories.';
