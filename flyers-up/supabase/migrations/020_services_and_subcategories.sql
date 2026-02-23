-- ============================================
-- Main Services + Subcategories System
-- ============================================
-- New tables: services, service_subcategories, pro_service_subcategories
-- Supports: Handyman (incl. Light Electrical), Event Organizer, etc.
-- Backward compat: service_pros.category_id kept; primary_service_id added
-- ============================================

-- ============================================
-- 1A. CREATE services
-- ============================================
CREATE TABLE IF NOT EXISTS public.services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  name text NOT NULL,
  description text,
  sort_order int NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================
-- 1B. CREATE service_subcategories
-- ============================================
CREATE TABLE IF NOT EXISTS public.service_subcategories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id uuid NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
  slug text NOT NULL,
  name text NOT NULL,
  description text,
  requires_license boolean NOT NULL DEFAULT false,
  sort_order int NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(service_id, slug)
);

-- ============================================
-- 1C. CREATE pro_service_subcategories
-- ============================================
CREATE TABLE IF NOT EXISTS public.pro_service_subcategories (
  pro_id uuid NOT NULL REFERENCES public.service_pros(id) ON DELETE CASCADE,
  subcategory_id uuid NOT NULL REFERENCES public.service_subcategories(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (pro_id, subcategory_id)
);

-- ============================================
-- 1D. Add primary_service_id to service_pros
-- ============================================
ALTER TABLE public.service_pros
  ADD COLUMN IF NOT EXISTS primary_service_id uuid REFERENCES public.services(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_service_pros_primary_service ON public.service_pros(primary_service_id);

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_service_subcategories_service_active_sort
  ON public.service_subcategories(service_id, is_active, sort_order);
CREATE INDEX IF NOT EXISTS idx_pro_service_subcategories_pro ON public.pro_service_subcategories(pro_id);
CREATE INDEX IF NOT EXISTS idx_pro_service_subcategories_subcategory ON public.pro_service_subcategories(subcategory_id);

-- ============================================
-- RLS
-- ============================================
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_subcategories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pro_service_subcategories ENABLE ROW LEVEL SECURITY;

-- services: public read for active only
DROP POLICY IF EXISTS "Public read active services" ON public.services;
CREATE POLICY "Public read active services"
  ON public.services FOR SELECT
  TO anon, authenticated
  USING (is_active = true);

-- service_subcategories: public read for active only
DROP POLICY IF EXISTS "Public read active subcategories" ON public.service_subcategories;
CREATE POLICY "Public read active subcategories"
  ON public.service_subcategories FOR SELECT
  TO anon, authenticated
  USING (is_active = true);

-- pro_service_subcategories: anyone can read (for marketplace browse; pros see their own via UI)
DROP POLICY IF EXISTS "Anyone can read pro subcategory selections" ON public.pro_service_subcategories;
CREATE POLICY "Anyone can read pro subcategory selections"
  ON public.pro_service_subcategories FOR SELECT
  TO anon, authenticated
  USING (true);

-- pro_service_subcategories: pros can insert for their own pro_id
DROP POLICY IF EXISTS "Pros can insert own subcategory selections" ON public.pro_service_subcategories;
CREATE POLICY "Pros can insert own subcategory selections"
  ON public.pro_service_subcategories FOR INSERT
  TO authenticated
  WITH CHECK (
    pro_id IN (SELECT id FROM public.service_pros WHERE user_id = auth.uid())
  );

-- pro_service_subcategories: pros can delete their own
DROP POLICY IF EXISTS "Pros can delete own subcategory selections" ON public.pro_service_subcategories;
CREATE POLICY "Pros can delete own subcategory selections"
  ON public.pro_service_subcategories FOR DELETE
  TO authenticated
  USING (
    pro_id IN (SELECT id FROM public.service_pros WHERE user_id = auth.uid())
  );

-- ============================================
-- SEED DATA (UPSERT)
-- ============================================

-- Seed main services
INSERT INTO public.services (slug, name, description, sort_order, is_active) VALUES
  ('cleaning', 'Cleaning', 'Home and office cleaning services', 10, true),
  ('handyman', 'Handyman', 'General repairs, assembly, and home improvement tasks', 20, true),
  ('move-help', 'Move Help', 'Labor, packing, and moving assistance', 30, true),
  ('event-organizer', 'Event Organizer', 'Event planning and coordination services', 40, true),
  ('dog-walking', 'Dog Walking', 'Dog walking and pet care services', 50, true),
  ('photography', 'Photography', 'Professional photography for events and portraits', 60, true),
  ('plumbing', 'Plumbing', 'Pipe repairs, installations, and emergencies (deprecated - use Handyman)', 999, false)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  sort_order = EXCLUDED.sort_order,
  is_active = EXCLUDED.is_active;

-- Ensure services have matching service_categories rows (for category_id backward compat)
INSERT INTO public.service_categories (slug, name, description, icon, is_active_phase1)
VALUES
  ('event-organizer', 'Event Organizer', 'Event planning and coordination services', '🎉', true),
  ('dog-walking', 'Dog Walking', 'Dog walking and pet care services', '🐕', true),
  ('photography', 'Photography', 'Professional photography for events and portraits', '📸', true)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  icon = EXCLUDED.icon,
  is_active_phase1 = true;

-- Handyman subcategories
INSERT INTO public.service_subcategories (service_id, slug, name, description, requires_license, sort_order)
SELECT s.id, 'furniture-assembly', 'Furniture Assembly', 'Furniture assembly and setup', false, 10
FROM public.services s WHERE s.slug = 'handyman' AND s.is_active
ON CONFLICT (service_id, slug) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, sort_order = EXCLUDED.sort_order;

INSERT INTO public.service_subcategories (service_id, slug, name, description, requires_license, sort_order)
SELECT s.id, 'tv-mounting', 'TV Mounting', 'TV and display mounting', false, 20
FROM public.services s WHERE s.slug = 'handyman' AND s.is_active
ON CONFLICT (service_id, slug) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, sort_order = EXCLUDED.sort_order;

INSERT INTO public.service_subcategories (service_id, slug, name, description, requires_license, sort_order)
SELECT s.id, 'general-repairs', 'General Repairs', 'Small fixes and repairs', false, 30
FROM public.services s WHERE s.slug = 'handyman' AND s.is_active
ON CONFLICT (service_id, slug) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, sort_order = EXCLUDED.sort_order;

INSERT INTO public.service_subcategories (service_id, slug, name, description, requires_license, sort_order)
SELECT s.id, 'minor-plumbing', 'Minor Plumbing (Non-licensed)', 'Minor plumbing fixes, no license required', false, 40
FROM public.services s WHERE s.slug = 'handyman' AND s.is_active
ON CONFLICT (service_id, slug) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, sort_order = EXCLUDED.sort_order;

INSERT INTO public.service_subcategories (service_id, slug, name, description, requires_license, sort_order)
SELECT s.id, 'light-electrical', 'Light Electrical (Non-licensed)', 'Light fixtures, switches, outlets', false, 50
FROM public.services s WHERE s.slug = 'handyman' AND s.is_active
ON CONFLICT (service_id, slug) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, sort_order = EXCLUDED.sort_order;

INSERT INTO public.service_subcategories (service_id, slug, name, description, requires_license, sort_order)
SELECT s.id, 'mounting-hanging', 'Mounting & Hanging', 'Frames, shelves, mirrors', false, 60
FROM public.services s WHERE s.slug = 'handyman' AND s.is_active
ON CONFLICT (service_id, slug) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, sort_order = EXCLUDED.sort_order;

INSERT INTO public.service_subcategories (service_id, slug, name, description, requires_license, sort_order)
SELECT s.id, 'caulking-sealing', 'Caulking & Sealing', 'Caulking and sealing', false, 70
FROM public.services s WHERE s.slug = 'handyman' AND s.is_active
ON CONFLICT (service_id, slug) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, sort_order = EXCLUDED.sort_order;

INSERT INTO public.service_subcategories (service_id, slug, name, description, requires_license, sort_order)
SELECT s.id, 'door-hardware', 'Door & Hardware', 'Locks, handles, hardware', false, 80
FROM public.services s WHERE s.slug = 'handyman' AND s.is_active
ON CONFLICT (service_id, slug) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, sort_order = EXCLUDED.sort_order;

-- Event Organizer subcategories
INSERT INTO public.service_subcategories (service_id, slug, name, description, requires_license, sort_order)
SELECT s.id, 'wedding-coordinator', 'Wedding Coordinators', 'Wedding planning and day-of coordination', false, 10
FROM public.services s WHERE s.slug = 'event-organizer' AND s.is_active
ON CONFLICT (service_id, slug) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, sort_order = EXCLUDED.sort_order;

INSERT INTO public.service_subcategories (service_id, slug, name, description, requires_license, sort_order)
SELECT s.id, 'corporate-business', 'Corporate & Business Event Planners', 'Corporate events and meetings', false, 20
FROM public.services s WHERE s.slug = 'event-organizer' AND s.is_active
ON CONFLICT (service_id, slug) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, sort_order = EXCLUDED.sort_order;

INSERT INTO public.service_subcategories (service_id, slug, name, description, requires_license, sort_order)
SELECT s.id, 'day-of-coordinator', 'Day-of Coordination', 'Day-of event coordination', false, 30
FROM public.services s WHERE s.slug = 'event-organizer' AND s.is_active
ON CONFLICT (service_id, slug) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, sort_order = EXCLUDED.sort_order;

INSERT INTO public.service_subcategories (service_id, slug, name, description, requires_license, sort_order)
SELECT s.id, 'birthday-celebrations', 'Birthday & Celebrations Planner', 'Birthdays and personal celebrations', false, 40
FROM public.services s WHERE s.slug = 'event-organizer' AND s.is_active
ON CONFLICT (service_id, slug) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, sort_order = EXCLUDED.sort_order;

INSERT INTO public.service_subcategories (service_id, slug, name, description, requires_license, sort_order)
SELECT s.id, 'themed-parties', 'Themed Party Planners', 'Themed parties and events', false, 50
FROM public.services s WHERE s.slug = 'event-organizer' AND s.is_active
ON CONFLICT (service_id, slug) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, sort_order = EXCLUDED.sort_order;

INSERT INTO public.service_subcategories (service_id, slug, name, description, requires_license, sort_order)
SELECT s.id, 'nonprofit-fundraiser', 'Fundraisers & Galas (Nonprofit)', 'Nonprofit and gala events', false, 60
FROM public.services s WHERE s.slug = 'event-organizer' AND s.is_active
ON CONFLICT (service_id, slug) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, sort_order = EXCLUDED.sort_order;

INSERT INTO public.service_subcategories (service_id, slug, name, description, requires_license, sort_order)
SELECT s.id, 'brand-activation', 'Brand Activations & Pop-ups', 'Brand events and pop-ups', false, 70
FROM public.services s WHERE s.slug = 'event-organizer' AND s.is_active
ON CONFLICT (service_id, slug) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, sort_order = EXCLUDED.sort_order;

INSERT INTO public.service_subcategories (service_id, slug, name, description, requires_license, sort_order)
SELECT s.id, 'conference-summit', 'Conferences & Summits', 'Conferences and summit planning', false, 80
FROM public.services s WHERE s.slug = 'event-organizer' AND s.is_active
ON CONFLICT (service_id, slug) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, sort_order = EXCLUDED.sort_order;

INSERT INTO public.service_subcategories (service_id, slug, name, description, requires_license, sort_order)
SELECT s.id, 'virtual-hybrid', 'Virtual/Hybrid Event Coordinators', 'Virtual and hybrid events', false, 90
FROM public.services s WHERE s.slug = 'event-organizer' AND s.is_active
ON CONFLICT (service_id, slug) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, sort_order = EXCLUDED.sort_order;

INSERT INTO public.service_subcategories (service_id, slug, name, description, requires_license, sort_order)
SELECT s.id, 'logistics-vendors', 'Vendor & Logistics Coordination', 'Vendor and logistics management', false, 100
FROM public.services s WHERE s.slug = 'event-organizer' AND s.is_active
ON CONFLICT (service_id, slug) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, sort_order = EXCLUDED.sort_order;

INSERT INTO public.service_subcategories (service_id, slug, name, description, requires_license, sort_order)
SELECT s.id, 'venue-scouting', 'Venue Scouting & Booking Support', 'Venue finding and booking', false, 110
FROM public.services s WHERE s.slug = 'event-organizer' AND s.is_active
ON CONFLICT (service_id, slug) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, sort_order = EXCLUDED.sort_order;

INSERT INTO public.service_subcategories (service_id, slug, name, description, requires_license, sort_order)
SELECT s.id, 'event-design-decor', 'Event Design & Decor Planning', 'Event design and decor', false, 120
FROM public.services s WHERE s.slug = 'event-organizer' AND s.is_active
ON CONFLICT (service_id, slug) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, sort_order = EXCLUDED.sort_order;

INSERT INTO public.service_subcategories (service_id, slug, name, description, requires_license, sort_order)
SELECT s.id, 'production-av', 'Production & A/V Coordination', 'Production and A/V planning (non-technical)', false, 130
FROM public.services s WHERE s.slug = 'event-organizer' AND s.is_active
ON CONFLICT (service_id, slug) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, sort_order = EXCLUDED.sort_order;

INSERT INTO public.service_subcategories (service_id, slug, name, description, requires_license, sort_order)
SELECT s.id, 'mini-plans', 'Mini Plans', 'Simple scheduling and vendor coordination for small events', false, 140
FROM public.services s WHERE s.slug = 'event-organizer' AND s.is_active
ON CONFLICT (service_id, slug) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, sort_order = EXCLUDED.sort_order;

INSERT INTO public.service_subcategories (service_id, slug, name, description, requires_license, sort_order)
SELECT s.id, 'standard-plans', 'Standard Plans', 'Full day-of planning for weddings, parties, etc.', false, 150
FROM public.services s WHERE s.slug = 'event-organizer' AND s.is_active
ON CONFLICT (service_id, slug) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, sort_order = EXCLUDED.sort_order;

INSERT INTO public.service_subcategories (service_id, slug, name, description, requires_license, sort_order)
SELECT s.id, 'premium-corporate-plans', 'Premium/Corporate Plans', 'End-to-end management for larger events or business functions', false, 160
FROM public.services s WHERE s.slug = 'event-organizer' AND s.is_active
ON CONFLICT (service_id, slug) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, sort_order = EXCLUDED.sort_order;

-- Cleaning subcategories (common ones for completeness)
INSERT INTO public.service_subcategories (service_id, slug, name, description, requires_license, sort_order)
SELECT s.id, 'standard-cleaning', 'Standard Cleaning', 'Regular home cleaning', false, 10
FROM public.services s WHERE s.slug = 'cleaning' AND s.is_active
ON CONFLICT (service_id, slug) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, sort_order = EXCLUDED.sort_order;

INSERT INTO public.service_subcategories (service_id, slug, name, description, requires_license, sort_order)
SELECT s.id, 'deep-cleaning', 'Deep Cleaning', 'Thorough deep clean', false, 20
FROM public.services s WHERE s.slug = 'cleaning' AND s.is_active
ON CONFLICT (service_id, slug) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, sort_order = EXCLUDED.sort_order;

INSERT INTO public.service_subcategories (service_id, slug, name, description, requires_license, sort_order)
SELECT s.id, 'move-out-cleaning', 'Move-Out Cleaning', 'Post move-out cleaning', false, 30
FROM public.services s WHERE s.slug = 'cleaning' AND s.is_active
ON CONFLICT (service_id, slug) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, sort_order = EXCLUDED.sort_order;

-- Move Help subcategories
INSERT INTO public.service_subcategories (service_id, slug, name, description, requires_license, sort_order)
SELECT s.id, 'labor-only', 'Labor Only', 'Moving labor without truck', false, 10
FROM public.services s WHERE s.slug = 'move-help' AND s.is_active
ON CONFLICT (service_id, slug) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, sort_order = EXCLUDED.sort_order;

INSERT INTO public.service_subcategories (service_id, slug, name, description, requires_license, sort_order)
SELECT s.id, 'packing-help', 'Packing Help', 'Packing and preparation', false, 20
FROM public.services s WHERE s.slug = 'move-help' AND s.is_active
ON CONFLICT (service_id, slug) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, sort_order = EXCLUDED.sort_order;

COMMENT ON TABLE public.services IS 'Main service categories (Handyman, Event Organizer, etc.)';
COMMENT ON TABLE public.service_subcategories IS 'Subcategories under each main service';
COMMENT ON TABLE public.pro_service_subcategories IS 'Which subcategories each pro offers';
COMMENT ON COLUMN public.service_pros.primary_service_id IS 'Primary main service from services table; syncs with category_id for backward compat';
