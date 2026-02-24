-- ============================================
-- Replace Photography with Trainer / Tutor
-- ============================================
-- Rules: No deletes. Slugs permanent. Use is_active for soft transitions.
-- Photography: set is_active = false (keep data for future reactivation).
-- Trainer/Tutor: upsert as new main service with 17 subcategories.
-- RLS preserved. Future-ready for recurring/packages.
-- ============================================

-- ============================================
-- 1. DEACTIVATE PHOTOGRAPHY (do NOT delete)
-- ============================================

UPDATE public.services
SET is_active = false
WHERE slug = 'photography';

-- Legacy service_categories: hide photography from Phase 1 browse
UPDATE public.service_categories
SET is_active_phase1 = false
WHERE slug = 'photography';

-- Subcategories remain; they stay linked to photography service for reactivation.

-- ============================================
-- 2. UPSERT MAIN SERVICE: Trainer / Tutor
-- ============================================

INSERT INTO public.services (slug, name, description, sort_order, is_active)
VALUES (
  'trainer-tutor',
  'Trainer / Tutor',
  'Academic tutoring, test prep, skill coaching, and personal training services.',
  40,
  true
)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  sort_order = EXCLUDED.sort_order,
  is_active = EXCLUDED.is_active;

-- Legacy service_categories for backward compat (category_id mapping)
INSERT INTO public.service_categories (slug, name, description, icon, is_active_phase1)
VALUES (
  'trainer-tutor',
  'Trainer / Tutor',
  'Academic tutoring, test prep, skill coaching, and personal training services.',
  '📚',
  true
)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  icon = EXCLUDED.icon,
  is_active_phase1 = EXCLUDED.is_active_phase1;

-- ============================================
-- 3. UPSERT TRAINER/TUTOR SUBCATEGORIES
-- ============================================
-- UNIQUE(service_id, slug). requires_license = false. is_active = true.

-- Academic Tutoring (1–7)
INSERT INTO public.service_subcategories (service_id, slug, name, description, requires_license, sort_order, is_active)
SELECT s.id, 'elementary-tutoring', 'Elementary School Tutoring', NULL, false, 10, true FROM public.services s WHERE s.slug = 'trainer-tutor'
ON CONFLICT (service_id, slug) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, sort_order = EXCLUDED.sort_order, is_active = EXCLUDED.is_active;

INSERT INTO public.service_subcategories (service_id, slug, name, description, requires_license, sort_order, is_active)
SELECT s.id, 'middle-school-tutoring', 'Middle School Tutoring', NULL, false, 20, true FROM public.services s WHERE s.slug = 'trainer-tutor'
ON CONFLICT (service_id, slug) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, sort_order = EXCLUDED.sort_order, is_active = EXCLUDED.is_active;

INSERT INTO public.service_subcategories (service_id, slug, name, description, requires_license, sort_order, is_active)
SELECT s.id, 'high-school-tutoring', 'High School Tutoring', NULL, false, 30, true FROM public.services s WHERE s.slug = 'trainer-tutor'
ON CONFLICT (service_id, slug) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, sort_order = EXCLUDED.sort_order, is_active = EXCLUDED.is_active;

INSERT INTO public.service_subcategories (service_id, slug, name, description, requires_license, sort_order, is_active)
SELECT s.id, 'regents-prep', 'Regents Exam Prep', NULL, false, 40, true FROM public.services s WHERE s.slug = 'trainer-tutor'
ON CONFLICT (service_id, slug) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, sort_order = EXCLUDED.sort_order, is_active = EXCLUDED.is_active;

INSERT INTO public.service_subcategories (service_id, slug, name, description, requires_license, sort_order, is_active)
SELECT s.id, 'shsat-prep', 'SHSAT Prep', NULL, false, 50, true FROM public.services s WHERE s.slug = 'trainer-tutor'
ON CONFLICT (service_id, slug) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, sort_order = EXCLUDED.sort_order, is_active = EXCLUDED.is_active;

INSERT INTO public.service_subcategories (service_id, slug, name, description, requires_license, sort_order, is_active)
SELECT s.id, 'sat-act-prep', 'SAT / ACT Prep', NULL, false, 60, true FROM public.services s WHERE s.slug = 'trainer-tutor'
ON CONFLICT (service_id, slug) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, sort_order = EXCLUDED.sort_order, is_active = EXCLUDED.is_active;

INSERT INTO public.service_subcategories (service_id, slug, name, description, requires_license, sort_order, is_active)
SELECT s.id, 'college-essay-coaching', 'College Essay Coaching', NULL, false, 70, true FROM public.services s WHERE s.slug = 'trainer-tutor'
ON CONFLICT (service_id, slug) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, sort_order = EXCLUDED.sort_order, is_active = EXCLUDED.is_active;

-- Skill-Based Coaching (8–13)
INSERT INTO public.service_subcategories (service_id, slug, name, description, requires_license, sort_order, is_active)
SELECT s.id, 'math-specialist', 'Math Specialist', NULL, false, 80, true FROM public.services s WHERE s.slug = 'trainer-tutor'
ON CONFLICT (service_id, slug) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, sort_order = EXCLUDED.sort_order, is_active = EXCLUDED.is_active;

INSERT INTO public.service_subcategories (service_id, slug, name, description, requires_license, sort_order, is_active)
SELECT s.id, 'science-specialist', 'Science Specialist', NULL, false, 90, true FROM public.services s WHERE s.slug = 'trainer-tutor'
ON CONFLICT (service_id, slug) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, sort_order = EXCLUDED.sort_order, is_active = EXCLUDED.is_active;

INSERT INTO public.service_subcategories (service_id, slug, name, description, requires_license, sort_order, is_active)
SELECT s.id, 'reading-writing', 'Reading & Writing Tutor', NULL, false, 100, true FROM public.services s WHERE s.slug = 'trainer-tutor'
ON CONFLICT (service_id, slug) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, sort_order = EXCLUDED.sort_order, is_active = EXCLUDED.is_active;

INSERT INTO public.service_subcategories (service_id, slug, name, description, requires_license, sort_order, is_active)
SELECT s.id, 'coding-tutor', 'Coding Tutor', NULL, false, 110, true FROM public.services s WHERE s.slug = 'trainer-tutor'
ON CONFLICT (service_id, slug) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, sort_order = EXCLUDED.sort_order, is_active = EXCLUDED.is_active;

INSERT INTO public.service_subcategories (service_id, slug, name, description, requires_license, sort_order, is_active)
SELECT s.id, 'esl-tutor', 'ESL (English as Second Language)', NULL, false, 120, true FROM public.services s WHERE s.slug = 'trainer-tutor'
ON CONFLICT (service_id, slug) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, sort_order = EXCLUDED.sort_order, is_active = EXCLUDED.is_active;

INSERT INTO public.service_subcategories (service_id, slug, name, description, requires_license, sort_order, is_active)
SELECT s.id, 'language-lessons', 'Foreign Language Lessons', NULL, false, 130, true FROM public.services s WHERE s.slug = 'trainer-tutor'
ON CONFLICT (service_id, slug) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, sort_order = EXCLUDED.sort_order, is_active = EXCLUDED.is_active;

-- Physical / Creative Training (14–17)
INSERT INTO public.service_subcategories (service_id, slug, name, description, requires_license, sort_order, is_active)
SELECT s.id, 'personal-fitness', 'Personal Fitness Training', NULL, false, 140, true FROM public.services s WHERE s.slug = 'trainer-tutor'
ON CONFLICT (service_id, slug) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, sort_order = EXCLUDED.sort_order, is_active = EXCLUDED.is_active;

INSERT INTO public.service_subcategories (service_id, slug, name, description, requires_license, sort_order, is_active)
SELECT s.id, 'youth-sports-coach', 'Youth Sports Coaching', NULL, false, 150, true FROM public.services s WHERE s.slug = 'trainer-tutor'
ON CONFLICT (service_id, slug) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, sort_order = EXCLUDED.sort_order, is_active = EXCLUDED.is_active;

INSERT INTO public.service_subcategories (service_id, slug, name, description, requires_license, sort_order, is_active)
SELECT s.id, 'music-lessons', 'Music Lessons', NULL, false, 160, true FROM public.services s WHERE s.slug = 'trainer-tutor'
ON CONFLICT (service_id, slug) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, sort_order = EXCLUDED.sort_order, is_active = EXCLUDED.is_active;

INSERT INTO public.service_subcategories (service_id, slug, name, description, requires_license, sort_order, is_active)
SELECT s.id, 'art-lessons', 'Art Lessons', NULL, false, 170, true FROM public.services s WHERE s.slug = 'trainer-tutor'
ON CONFLICT (service_id, slug) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, sort_order = EXCLUDED.sort_order, is_active = EXCLUDED.is_active;

-- ============================================
-- RLS: No changes required
-- ============================================
-- services / service_subcategories policies use is_active; new rows inherit.
-- pro_service_subcategories unchanged.
