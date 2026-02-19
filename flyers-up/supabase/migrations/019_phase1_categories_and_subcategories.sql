-- ============================================
-- PHASE 1: Restrict visible services to 4 core categories
-- Soft visibility - no deletes, no FK changes.
-- ============================================

-- 1) Add is_active_phase1 column
ALTER TABLE public.service_categories
  ADD COLUMN IF NOT EXISTS is_active_phase1 boolean NOT NULL DEFAULT false;

-- 2) Add parent_id for sub-category hierarchy
ALTER TABLE public.service_categories
  ADD COLUMN IF NOT EXISTS parent_id uuid REFERENCES public.service_categories(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_service_categories_parent_id ON public.service_categories(parent_id);
CREATE INDEX IF NOT EXISTS idx_service_categories_is_active_phase1 ON public.service_categories(is_active_phase1);

-- 3) Ensure Move Help exists
INSERT INTO public.service_categories (slug, name, description, icon, is_active_phase1)
VALUES (
  'move-help',
  'Move Help',
  'Labor, packing, and moving assistance',
  '📦',
  true
)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  icon = EXCLUDED.icon,
  is_active_phase1 = true;

-- 4) Set Phase 1 active for the 4 core categories only
UPDATE public.service_categories
SET is_active_phase1 = true
WHERE name IN (
  'Cleaning',
  'Handyman',
  'Move Help',
  'Plumbing'
);

-- 5) Create sub-categories under the 4 core (parent_id structure)
-- Cleaning sub-categories
INSERT INTO public.service_categories (slug, name, description, icon, parent_id, is_active_phase1)
SELECT 'standard-cleaning', 'Standard Cleaning', 'Regular home cleaning', '🧹', id, true
FROM public.service_categories WHERE slug = 'cleaning' AND parent_id IS NULL LIMIT 1
ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.service_categories (slug, name, description, icon, parent_id, is_active_phase1)
SELECT 'deep-cleaning', 'Deep Cleaning', 'Thorough deep clean', '🧹', id, true
FROM public.service_categories WHERE slug = 'cleaning' AND parent_id IS NULL LIMIT 1
ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.service_categories (slug, name, description, icon, parent_id, is_active_phase1)
SELECT 'move-out-cleaning', 'Move-Out Cleaning', 'Cleaning after move-out', '🧹', id, true
FROM public.service_categories WHERE slug = 'cleaning' AND parent_id IS NULL LIMIT 1
ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.service_categories (slug, name, description, icon, parent_id, is_active_phase1)
SELECT 'post-construction-cleaning', 'Post-Construction Cleaning', 'Post-renovation cleanup', '🧹', id, true
FROM public.service_categories WHERE slug = 'cleaning' AND parent_id IS NULL LIMIT 1
ON CONFLICT (slug) DO NOTHING;

-- Handyman sub-categories
INSERT INTO public.service_categories (slug, name, description, icon, parent_id, is_active_phase1)
SELECT 'furniture-assembly', 'Furniture Assembly', 'Furniture assembly and setup', '🔨', id, true
FROM public.service_categories WHERE slug = 'handyman' AND parent_id IS NULL LIMIT 1
ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.service_categories (slug, name, description, icon, parent_id, is_active_phase1)
SELECT 'tv-mounting', 'TV Mounting', 'TV and display mounting', '🔨', id, true
FROM public.service_categories WHERE slug = 'handyman' AND parent_id IS NULL LIMIT 1
ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.service_categories (slug, name, description, icon, parent_id, is_active_phase1)
SELECT 'minor-repairs', 'Minor Repairs', 'Small fixes and repairs', '🔨', id, true
FROM public.service_categories WHERE slug = 'handyman' AND parent_id IS NULL LIMIT 1
ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.service_categories (slug, name, description, icon, parent_id, is_active_phase1)
SELECT 'smart-device-install', 'Smart Device Install', 'Smart home device installation', '🔨', id, true
FROM public.service_categories WHERE slug = 'handyman' AND parent_id IS NULL LIMIT 1
ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.service_categories (slug, name, description, icon, parent_id, is_active_phase1)
SELECT 'caulking-grout-refresh', 'Caulking / Grout Refresh', 'Caulking and grout refresh', '🔨', id, true
FROM public.service_categories WHERE slug = 'handyman' AND parent_id IS NULL LIMIT 1
ON CONFLICT (slug) DO NOTHING;

-- Move Help sub-categories
INSERT INTO public.service_categories (slug, name, description, icon, parent_id, is_active_phase1)
SELECT 'labor-only', 'Labor Only', 'Moving labor without truck', '📦', id, true
FROM public.service_categories WHERE slug = 'move-help' AND parent_id IS NULL LIMIT 1
ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.service_categories (slug, name, description, icon, parent_id, is_active_phase1)
SELECT 'packing-help', 'Packing Help', 'Packing and preparation', '📦', id, true
FROM public.service_categories WHERE slug = 'move-help' AND parent_id IS NULL LIMIT 1
ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.service_categories (slug, name, description, icon, parent_id, is_active_phase1)
SELECT 'stairs-long-carry-addon', 'Stairs / Long Carry Add-On', 'Stairs and long carry assistance', '📦', id, true
FROM public.service_categories WHERE slug = 'move-help' AND parent_id IS NULL LIMIT 1
ON CONFLICT (slug) DO NOTHING;

-- Plumbing sub-categories
INSERT INTO public.service_categories (slug, name, description, icon, parent_id, is_active_phase1)
SELECT 'faucet-replacement', 'Faucet Replacement', 'Faucet repair and replacement', '🔧', id, true
FROM public.service_categories WHERE slug = 'plumbing' AND parent_id IS NULL LIMIT 1
ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.service_categories (slug, name, description, icon, parent_id, is_active_phase1)
SELECT 'toilet-install', 'Toilet Install', 'Toilet installation', '🔧', id, true
FROM public.service_categories WHERE slug = 'plumbing' AND parent_id IS NULL LIMIT 1
ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.service_categories (slug, name, description, icon, parent_id, is_active_phase1)
SELECT 'drain-unclog', 'Drain Unclog', 'Drain cleaning and unclogging', '🔧', id, true
FROM public.service_categories WHERE slug = 'plumbing' AND parent_id IS NULL LIMIT 1
ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.service_categories (slug, name, description, icon, parent_id, is_active_phase1)
SELECT 'garbage-disposal-install', 'Garbage Disposal Install', 'Garbage disposal installation', '🔧', id, true
FROM public.service_categories WHERE slug = 'plumbing' AND parent_id IS NULL LIMIT 1
ON CONFLICT (slug) DO NOTHING;

-- 6) admin_updates table for logging toggle changes (optional)
CREATE TABLE IF NOT EXISTS public.admin_updates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  table_name text NOT NULL,
  record_id uuid,
  action text NOT NULL,
  payload jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_admin_updates_created_at ON public.admin_updates(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_updates_table_record ON public.admin_updates(table_name, record_id);

COMMENT ON COLUMN public.service_categories.is_active_phase1 IS 'Phase 1 rollout: only true categories visible to customers and pro onboarding.';
COMMENT ON COLUMN public.service_categories.parent_id IS 'Parent category for sub-categories. NULL = top-level.';
