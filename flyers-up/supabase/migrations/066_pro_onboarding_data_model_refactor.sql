-- ============================================
-- PRO ONBOARDING DATA MODEL REFACTOR
-- ============================================
-- categories -> occupations -> services (strict hierarchy)
-- pro_services for pro service selections
-- ============================================

-- 1) categories
CREATE TABLE IF NOT EXISTS public.categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  name text NOT NULL,
  icon text,
  sort_order int NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_categories_active_sort ON public.categories(is_active, sort_order);
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read categories" ON public.categories;
CREATE POLICY "Public read categories" ON public.categories FOR SELECT TO anon, authenticated USING (is_active = true);

-- 2) Alter occupations: add category_id, description, sort_order, is_active
ALTER TABLE public.occupations ADD COLUMN IF NOT EXISTS category_id uuid REFERENCES public.categories(id) ON DELETE SET NULL;
ALTER TABLE public.occupations ADD COLUMN IF NOT EXISTS description text;
ALTER TABLE public.occupations ADD COLUMN IF NOT EXISTS sort_order int NOT NULL DEFAULT 0;
ALTER TABLE public.occupations ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;
CREATE INDEX IF NOT EXISTS idx_occupations_category ON public.occupations(category_id);
CREATE INDEX IF NOT EXISTS idx_occupations_active_sort ON public.occupations(is_active, sort_order);

-- 3) Enhance occupation_services as services table (add slug, pricing_model, is_active)
ALTER TABLE public.occupation_services ADD COLUMN IF NOT EXISTS slug text;
ALTER TABLE public.occupation_services ADD COLUMN IF NOT EXISTS pricing_model text DEFAULT 'fixed';
ALTER TABLE public.occupation_services ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;

-- Backfill slug from name where null (before delete)
UPDATE public.occupation_services
SET slug = lower(regexp_replace(regexp_replace(coalesce(name, 'unknown'), '[^a-zA-Z0-9\s-]', '', 'g'), '\s+', '-', 'g'))
WHERE slug IS NULL OR slug = '';

-- Add NOT NULL for slug after backfill
ALTER TABLE public.occupation_services ALTER COLUMN slug SET NOT NULL;

-- Drop old unique (occupation_id, name) if exists; use (occupation_id, slug)
ALTER TABLE public.occupation_services DROP CONSTRAINT IF EXISTS occupation_services_occupation_id_name_key;
CREATE UNIQUE INDEX IF NOT EXISTS idx_occupation_services_occupation_slug
  ON public.occupation_services(occupation_id, slug);

-- 4) pro_services: which services a pro offers
CREATE TABLE IF NOT EXISTS public.pro_services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pro_id uuid NOT NULL REFERENCES public.service_pros(id) ON DELETE CASCADE,
  service_id uuid NOT NULL REFERENCES public.occupation_services(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(pro_id, service_id)
);

CREATE INDEX IF NOT EXISTS idx_pro_services_pro ON public.pro_services(pro_id);
CREATE INDEX IF NOT EXISTS idx_pro_services_service ON public.pro_services(service_id);

ALTER TABLE public.pro_services ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Pros can manage own pro_services" ON public.pro_services;
CREATE POLICY "Pros can manage own pro_services" ON public.pro_services
  FOR ALL TO authenticated
  USING (pro_id IN (SELECT id FROM public.service_pros WHERE user_id = auth.uid()))
  WITH CHECK (pro_id IN (SELECT id FROM public.service_pros WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Public read pro_services" ON public.pro_services;
CREATE POLICY "Public read pro_services" ON public.pro_services FOR SELECT TO anon, authenticated USING (true);

-- 5) Add occupation_id to service_pros for strict occupation binding
ALTER TABLE public.service_pros ADD COLUMN IF NOT EXISTS occupation_id uuid REFERENCES public.occupations(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_service_pros_occupation ON public.service_pros(occupation_id);

-- 6) Seed categories
INSERT INTO public.categories (slug, name, icon, sort_order, is_active) VALUES
  ('home-services', 'Home & Property', '🏠', 10, true),
  ('education', 'Education', '📚', 20, true),
  ('media-events', 'Media & Events', '🎬', 30, true),
  ('pet-care', 'Pet Care', '🐕', 40, true),
  ('personal-care', 'Personal Care', '✂️', 50, true),
  ('automotive', 'Automotive', '🚗', 60, true),
  ('seasonal', 'Seasonal', '❄️', 70, true)
ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name, icon = EXCLUDED.icon, sort_order = EXCLUDED.sort_order;

-- 7) Update occupations with category_id
UPDATE public.occupations SET category_id = (SELECT id FROM public.categories WHERE slug = 'home-services' LIMIT 1), sort_order = 10, is_active = true WHERE slug IN ('cleaner', 'handyman', 'home-organizer', 'painter', 'landscaper');
UPDATE public.occupations SET category_id = (SELECT id FROM public.categories WHERE slug = 'seasonal' LIMIT 1), sort_order = 20, is_active = true WHERE slug = 'snow-removal';
UPDATE public.occupations SET category_id = (SELECT id FROM public.categories WHERE slug = 'education' LIMIT 1), sort_order = 30, is_active = true WHERE slug IN ('tutor', 'personal-trainer');
UPDATE public.occupations SET category_id = (SELECT id FROM public.categories WHERE slug = 'media-events' LIMIT 1), sort_order = 40, is_active = true WHERE slug IN ('photographer', 'videographer', 'dj', 'event-planner', 'chef', 'makeup-artist');
UPDATE public.occupations SET category_id = (SELECT id FROM public.categories WHERE slug = 'pet-care' LIMIT 1), sort_order = 50, is_active = true WHERE slug = 'dog-walker';
UPDATE public.occupations SET category_id = (SELECT id FROM public.categories WHERE slug = 'personal-care' LIMIT 1), sort_order = 60, is_active = true WHERE slug IN ('barber');
UPDATE public.occupations SET category_id = (SELECT id FROM public.categories WHERE slug = 'automotive' LIMIT 1), sort_order = 70, is_active = true WHERE slug IN ('mechanic', 'car-detailer');
UPDATE public.occupations SET category_id = (SELECT id FROM public.categories WHERE slug = 'home-services' LIMIT 1), sort_order = 80, is_active = true WHERE slug IN ('mover', 'it-technician');

-- 8) Replace occupation_services with clean seed data per user spec
-- Handyman, Snow Removal, Tutor, Photographer, Videographer
DELETE FROM public.occupation_services;

INSERT INTO public.occupation_services (occupation_id, slug, name, description, pricing_model, sort_order, is_active)
SELECT id, 'furniture-assembly', 'Furniture Assembly', 'Furniture assembly and setup', 'fixed', 10, true FROM public.occupations WHERE slug = 'handyman'
UNION ALL SELECT id, 'tv-mounting', 'TV Mounting', 'TV and display mounting', 'fixed', 20, true FROM public.occupations WHERE slug = 'handyman'
UNION ALL SELECT id, 'general-repairs', 'General Repairs', 'General home repairs', 'fixed', 30, true FROM public.occupations WHERE slug = 'handyman'
UNION ALL SELECT id, 'minor-plumbing', 'Minor Plumbing (Non-licensed)', 'Minor plumbing fixes', 'fixed', 40, true FROM public.occupations WHERE slug = 'handyman';

INSERT INTO public.occupation_services (occupation_id, slug, name, description, pricing_model, sort_order, is_active)
SELECT id, 'driveway-shoveling', 'Driveway Shoveling', 'Driveway snow removal', 'fixed', 10, true FROM public.occupations WHERE slug = 'snow-removal'
UNION ALL SELECT id, 'sidewalk-clearing', 'Sidewalk Clearing', 'Sidewalk snow removal', 'fixed', 20, true FROM public.occupations WHERE slug = 'snow-removal'
UNION ALL SELECT id, 'ice-salting', 'Ice Salting', 'Ice and snow salting', 'fixed', 30, true FROM public.occupations WHERE slug = 'snow-removal'
UNION ALL SELECT id, 'entryway-clearing', 'Entryway Clearing', 'Entry and walkway clearing', 'fixed', 40, true FROM public.occupations WHERE slug = 'snow-removal'
UNION ALL SELECT id, 'snow-blower-service', 'Snow Blower Service', 'Snow blower clearing', 'fixed', 50, true FROM public.occupations WHERE slug = 'snow-removal';

INSERT INTO public.occupation_services (occupation_id, slug, name, description, pricing_model, sort_order, is_active)
SELECT id, 'math-tutoring', 'Math Tutoring', 'Mathematics tutoring', 'fixed', 10, true FROM public.occupations WHERE slug = 'tutor'
UNION ALL SELECT id, 'reading-tutoring', 'Reading Tutoring', 'Reading and literacy', 'fixed', 20, true FROM public.occupations WHERE slug = 'tutor'
UNION ALL SELECT id, 'science-tutoring', 'Science Tutoring', 'Science tutoring', 'fixed', 30, true FROM public.occupations WHERE slug = 'tutor'
UNION ALL SELECT id, 'sat-prep', 'SAT Prep', 'SAT test preparation', 'fixed', 40, true FROM public.occupations WHERE slug = 'tutor';

INSERT INTO public.occupation_services (occupation_id, slug, name, description, pricing_model, sort_order, is_active)
SELECT id, 'portrait-photography', 'Portrait Photography', 'Portrait and headshot photography', 'fixed', 10, true FROM public.occupations WHERE slug = 'photographer'
UNION ALL SELECT id, 'event-photography', 'Event Photography', 'Event coverage photography', 'fixed', 20, true FROM public.occupations WHERE slug = 'photographer'
UNION ALL SELECT id, 'headshots', 'Headshots', 'Professional headshots', 'fixed', 30, true FROM public.occupations WHERE slug = 'photographer';

INSERT INTO public.occupation_services (occupation_id, slug, name, description, pricing_model, sort_order, is_active)
SELECT id, 'event-videography', 'Event Videography', 'Event video coverage', 'fixed', 10, true FROM public.occupations WHERE slug = 'videographer'
UNION ALL SELECT id, 'promo-video', 'Promo Video', 'Promotional video production', 'fixed', 20, true FROM public.occupations WHERE slug = 'videographer'
UNION ALL SELECT id, 'social-media-clips', 'Social Media Clips', 'Short-form social media content', 'fixed', 30, true FROM public.occupations WHERE slug = 'videographer';

-- Other occupations: restore common services
INSERT INTO public.occupation_services (occupation_id, slug, name, description, pricing_model, sort_order, is_active)
SELECT id, 'standard-cleaning', 'Standard Cleaning', 'Regular home cleaning', 'fixed', 10, true FROM public.occupations WHERE slug = 'cleaner'
UNION ALL SELECT id, 'deep-cleaning', 'Deep Cleaning', 'Thorough deep clean', 'fixed', 20, true FROM public.occupations WHERE slug = 'cleaner'
UNION ALL SELECT id, 'move-out-cleaning', 'Move-out Cleaning', 'Post move-out cleaning', 'fixed', 30, true FROM public.occupations WHERE slug = 'cleaner';

INSERT INTO public.occupation_services (occupation_id, slug, name, description, pricing_model, sort_order, is_active)
SELECT id, 'daily-dog-walks', 'Daily Dog Walks', 'Regular dog walking', 'fixed', 10, true FROM public.occupations WHERE slug = 'dog-walker'
UNION ALL SELECT id, 'pet-sitting', 'Pet Sitting', 'In-home pet care', 'fixed', 20, true FROM public.occupations WHERE slug = 'dog-walker';

INSERT INTO public.occupation_services (occupation_id, slug, name, description, pricing_model, sort_order, is_active)
SELECT id, 'wedding-planning', 'Wedding Planning', 'Wedding planning and coordination', 'fixed', 10, true FROM public.occupations WHERE slug = 'event-planner'
UNION ALL SELECT id, 'corporate-events', 'Corporate Events', 'Corporate event planning', 'fixed', 20, true FROM public.occupations WHERE slug = 'event-planner';

INSERT INTO public.occupation_services (occupation_id, slug, name, description, pricing_model, sort_order, is_active)
SELECT id, 'apartment-moving', 'Apartment Moving', 'Apartment and small moves', 'fixed', 10, true FROM public.occupations WHERE slug = 'mover'
UNION ALL SELECT id, 'furniture-moving', 'Furniture Moving', 'Furniture delivery and moving', 'fixed', 20, true FROM public.occupations WHERE slug = 'mover';

-- Remaining occupations: minimal services so all have at least one
INSERT INTO public.occupation_services (occupation_id, slug, name, description, pricing_model, sort_order, is_active)
SELECT id, 'strength-training', 'Strength Training', 'Strength and conditioning', 'fixed', 10, true FROM public.occupations WHERE slug = 'personal-trainer'
UNION ALL SELECT id, 'wedding-dj', 'Wedding DJ', 'Wedding DJ services', 'fixed', 10, true FROM public.occupations WHERE slug = 'dj'
UNION ALL SELECT id, 'private-chef', 'Private Chef', 'In-home private chef', 'fixed', 10, true FROM public.occupations WHERE slug = 'chef'
UNION ALL SELECT id, 'bridal-makeup', 'Bridal Makeup', 'Bridal makeup services', 'fixed', 10, true FROM public.occupations WHERE slug = 'makeup-artist'
UNION ALL SELECT id, 'haircut', 'Haircut', 'Haircut services', 'fixed', 10, true FROM public.occupations WHERE slug = 'barber'
UNION ALL SELECT id, 'oil-change', 'Oil Change', 'Oil change services', 'fixed', 10, true FROM public.occupations WHERE slug = 'mechanic'
UNION ALL SELECT id, 'computer-repair', 'Computer Repair', 'Computer repair services', 'fixed', 10, true FROM public.occupations WHERE slug = 'it-technician'
UNION ALL SELECT id, 'lawn-care', 'Lawn Care', 'Lawn maintenance', 'fixed', 10, true FROM public.occupations WHERE slug = 'landscaper'
UNION ALL SELECT id, 'interior-painting', 'Interior Painting', 'Interior paint services', 'fixed', 10, true FROM public.occupations WHERE slug = 'painter'
UNION ALL SELECT id, 'full-detail', 'Full Detail', 'Complete car detailing', 'fixed', 10, true FROM public.occupations WHERE slug = 'car-detailer'
UNION ALL SELECT id, 'closet-organization', 'Closet Organization', 'Closet organizing', 'fixed', 10, true FROM public.occupations WHERE slug = 'home-organizer';

-- 9) Optional: service_options for future scope modifiers
CREATE TABLE IF NOT EXISTS public.service_options (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id uuid NOT NULL REFERENCES public.occupation_services(id) ON DELETE CASCADE,
  name text NOT NULL,
  option_type text NOT NULL DEFAULT 'select',
  is_required boolean NOT NULL DEFAULT false,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_service_options_service ON public.service_options(service_id);
ALTER TABLE public.service_options ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read service_options" ON public.service_options;
CREATE POLICY "Public read service_options" ON public.service_options FOR SELECT TO anon, authenticated USING (true);

COMMENT ON TABLE public.categories IS 'Top-level categories for grouping occupations';
COMMENT ON TABLE public.occupations IS 'Occupations under categories; each has category_id';
COMMENT ON TABLE public.occupation_services IS 'Services under occupations; each has occupation_id (strict)';
COMMENT ON TABLE public.pro_services IS 'Which services a pro offers; service_id must belong to pro occupation';
COMMENT ON TABLE public.service_options IS 'Optional scope modifiers for services (future use)';
