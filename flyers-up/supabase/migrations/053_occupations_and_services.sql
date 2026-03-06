-- ============================================
-- OCCUPATION → SERVICES STRUCTURE
-- ============================================
-- New tables: occupations, occupation_services
-- Backward compatible: existing services/subcategories unchanged for booking
-- ============================================

-- 1) occupations
CREATE TABLE IF NOT EXISTS public.occupations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text UNIQUE NOT NULL,
  icon text,
  featured boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_occupations_featured ON public.occupations(featured) WHERE featured = true;
CREATE INDEX IF NOT EXISTS idx_occupations_slug ON public.occupations(slug);

-- 2) occupation_services (services under each occupation)
CREATE TABLE IF NOT EXISTS public.occupation_services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  occupation_id uuid NOT NULL REFERENCES public.occupations(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(occupation_id, name)
);

CREATE INDEX IF NOT EXISTS idx_occupation_services_occupation ON public.occupation_services(occupation_id);

-- RLS
ALTER TABLE public.occupations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.occupation_services ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read occupations" ON public.occupations;
CREATE POLICY "Public read occupations"
  ON public.occupations FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "Public read occupation_services" ON public.occupation_services;
CREATE POLICY "Public read occupation_services"
  ON public.occupation_services FOR SELECT TO anon, authenticated USING (true);

-- ============================================
-- SEED: OCCUPATIONS
-- ============================================

INSERT INTO public.occupations (slug, name, icon, featured) VALUES
  ('cleaner', 'Cleaner', '🧹', true),
  ('handyman', 'Handyman', '🔧', true),
  ('tutor', 'Tutor', '📚', true),
  ('dog-walker', 'Dog Walker', '🐕', true),
  ('event-planner', 'Event Planner', '🎉', true),
  ('mover', 'Mover', '📦', false),
  ('personal-trainer', 'Personal Trainer', '💪', false),
  ('photographer', 'Photographer', '📸', false),
  ('videographer', 'Videographer', '🎬', false),
  ('dj', 'DJ', '🎧', false),
  ('chef', 'Chef', '👨‍🍳', false),
  ('makeup-artist', 'Makeup Artist', '💄', false),
  ('barber', 'Barber', '✂️', false),
  ('mechanic', 'Mechanic', '🔩', false),
  ('it-technician', 'IT Technician', '💻', false),
  ('landscaper', 'Landscaper', '🌿', false),
  ('snow-removal', 'Snow Removal', '❄️', false),
  ('painter', 'Painter', '🖌️', false),
  ('car-detailer', 'Car Detailer', '🚗', false),
  ('home-organizer', 'Home Organizer', '📋', false)
ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name, icon = EXCLUDED.icon, featured = EXCLUDED.featured;

-- ============================================
-- SEED: OCCUPATION SERVICES
-- ============================================

-- Cleaner
INSERT INTO public.occupation_services (occupation_id, name, description, sort_order)
SELECT id, 'Standard Cleaning', 'Regular home cleaning', 10 FROM public.occupations WHERE slug = 'cleaner'
UNION ALL SELECT id, 'Deep Cleaning', 'Thorough deep clean', 20 FROM public.occupations WHERE slug = 'cleaner'
UNION ALL SELECT id, 'Move-out Cleaning', 'Post move-out cleaning', 30 FROM public.occupations WHERE slug = 'cleaner'
UNION ALL SELECT id, 'Airbnb Turnover', 'Short-term rental turnover cleaning', 40 FROM public.occupations WHERE slug = 'cleaner'
UNION ALL SELECT id, 'Office Cleaning', 'Commercial and office cleaning', 50 FROM public.occupations WHERE slug = 'cleaner'
UNION ALL SELECT id, 'Post-construction Cleaning', 'Cleanup after renovations', 60 FROM public.occupations WHERE slug = 'cleaner'
ON CONFLICT (occupation_id, name) DO UPDATE SET description = EXCLUDED.description, sort_order = EXCLUDED.sort_order;

-- Handyman
INSERT INTO public.occupation_services (occupation_id, name, description, sort_order)
SELECT id, 'Furniture Assembly', 'Furniture assembly and setup', 10 FROM public.occupations WHERE slug = 'handyman'
UNION ALL SELECT id, 'TV Mounting', 'TV and display mounting', 20 FROM public.occupations WHERE slug = 'handyman'
UNION ALL SELECT id, 'Minor Plumbing', 'Minor plumbing fixes', 30 FROM public.occupations WHERE slug = 'handyman'
UNION ALL SELECT id, 'Light Electrical', 'Light fixtures, switches, outlets', 40 FROM public.occupations WHERE slug = 'handyman'
UNION ALL SELECT id, 'Drywall Repair', 'Drywall repair and patching', 50 FROM public.occupations WHERE slug = 'handyman'
UNION ALL SELECT id, 'Door Installation', 'Door and hardware installation', 60 FROM public.occupations WHERE slug = 'handyman'
UNION ALL SELECT id, 'Wall Mounting', 'Frames, shelves, mirrors', 70 FROM public.occupations WHERE slug = 'handyman'
ON CONFLICT (occupation_id, name) DO UPDATE SET description = EXCLUDED.description, sort_order = EXCLUDED.sort_order;

-- Tutor
INSERT INTO public.occupation_services (occupation_id, name, description, sort_order)
SELECT id, 'Math Tutor', 'Mathematics tutoring', 10 FROM public.occupations WHERE slug = 'tutor'
UNION ALL SELECT id, 'Science Tutor', 'Science tutoring', 20 FROM public.occupations WHERE slug = 'tutor'
UNION ALL SELECT id, 'SAT Prep', 'SAT test preparation', 30 FROM public.occupations WHERE slug = 'tutor'
UNION ALL SELECT id, 'ACT Prep', 'ACT test preparation', 40 FROM public.occupations WHERE slug = 'tutor'
UNION ALL SELECT id, 'Language Tutor', 'Language learning', 50 FROM public.occupations WHERE slug = 'tutor'
UNION ALL SELECT id, 'Homework Help', 'General homework assistance', 60 FROM public.occupations WHERE slug = 'tutor'
UNION ALL SELECT id, 'Music Lessons', 'Music instruction', 70 FROM public.occupations WHERE slug = 'tutor';

-- Dog Walker
INSERT INTO public.occupation_services (occupation_id, name, description, sort_order)
SELECT id, 'Daily Dog Walks', 'Regular dog walking', 10 FROM public.occupations WHERE slug = 'dog-walker'
UNION ALL SELECT id, 'Pet Sitting', 'In-home pet care', 20 FROM public.occupations WHERE slug = 'dog-walker'
UNION ALL SELECT id, 'Overnight Pet Care', 'Overnight pet sitting', 30 FROM public.occupations WHERE slug = 'dog-walker'
UNION ALL SELECT id, 'Cat Sitting', 'Cat care visits', 40 FROM public.occupations WHERE slug = 'dog-walker'
UNION ALL SELECT id, 'Puppy Visits', 'Puppy care and visits', 50 FROM public.occupations WHERE slug = 'dog-walker'
UNION ALL SELECT id, 'Pet Transportation', 'Pet transport services', 60 FROM public.occupations WHERE slug = 'dog-walker'
ON CONFLICT (occupation_id, name) DO UPDATE SET description = EXCLUDED.description, sort_order = EXCLUDED.sort_order;

-- Event Planner
INSERT INTO public.occupation_services (occupation_id, name, description, sort_order)
SELECT id, 'Wedding Planner', 'Wedding planning and coordination', 10 FROM public.occupations WHERE slug = 'event-planner'
UNION ALL SELECT id, 'Corporate Events', 'Corporate event planning', 20 FROM public.occupations WHERE slug = 'event-planner'
UNION ALL SELECT id, 'Birthday Parties', 'Birthday party planning', 30 FROM public.occupations WHERE slug = 'event-planner'
UNION ALL SELECT id, 'Baby Showers', 'Baby shower planning', 40 FROM public.occupations WHERE slug = 'event-planner'
UNION ALL SELECT id, 'Themed Events', 'Themed party planning', 50 FROM public.occupations WHERE slug = 'event-planner'
UNION ALL SELECT id, 'Virtual Events', 'Virtual and hybrid events', 60 FROM public.occupations WHERE slug = 'event-planner'
ON CONFLICT (occupation_id, name) DO UPDATE SET description = EXCLUDED.description, sort_order = EXCLUDED.sort_order;

-- Mover
INSERT INTO public.occupation_services (occupation_id, name, description, sort_order)
SELECT id, 'Apartment Moving', 'Apartment and small moves', 10 FROM public.occupations WHERE slug = 'mover'
UNION ALL SELECT id, 'Furniture Moving', 'Furniture delivery and moving', 20 FROM public.occupations WHERE slug = 'mover'
UNION ALL SELECT id, 'Packing Services', 'Packing and preparation', 30 FROM public.occupations WHERE slug = 'mover'
UNION ALL SELECT id, 'Junk Removal', 'Junk and debris removal', 40 FROM public.occupations WHERE slug = 'mover'
UNION ALL SELECT id, 'Storage Moving', 'Storage unit moves', 50 FROM public.occupations WHERE slug = 'mover'
ON CONFLICT (occupation_id, name) DO UPDATE SET description = EXCLUDED.description, sort_order = EXCLUDED.sort_order;

-- Personal Trainer
INSERT INTO public.occupation_services (occupation_id, name, description, sort_order)
SELECT id, 'Strength Training', 'Strength and conditioning', 10 FROM public.occupations WHERE slug = 'personal-trainer'
UNION ALL SELECT id, 'Weight Loss Coaching', 'Weight loss programs', 20 FROM public.occupations WHERE slug = 'personal-trainer'
UNION ALL SELECT id, 'Athletic Training', 'Sports performance training', 30 FROM public.occupations WHERE slug = 'personal-trainer'
UNION ALL SELECT id, 'Yoga Training', 'Yoga instruction', 40 FROM public.occupations WHERE slug = 'personal-trainer'
UNION ALL SELECT id, 'Boxing Training', 'Boxing and fitness', 50 FROM public.occupations WHERE slug = 'personal-trainer'
UNION ALL SELECT id, 'Rehabilitation Training', 'Injury rehabilitation', 60 FROM public.occupations WHERE slug = 'personal-trainer'
ON CONFLICT (occupation_id, name) DO UPDATE SET description = EXCLUDED.description, sort_order = EXCLUDED.sort_order;

-- Photographer
INSERT INTO public.occupation_services (occupation_id, name, description, sort_order)
SELECT id, 'Portrait Photography', 'Portrait and headshot photography', 10 FROM public.occupations WHERE slug = 'photographer'
UNION ALL SELECT id, 'Wedding Photography', 'Wedding and event photography', 20 FROM public.occupations WHERE slug = 'photographer'
UNION ALL SELECT id, 'Event Photography', 'Event coverage', 30 FROM public.occupations WHERE slug = 'photographer'
UNION ALL SELECT id, 'Real Estate Photography', 'Property photography', 40 FROM public.occupations WHERE slug = 'photographer'
UNION ALL SELECT id, 'Product Photography', 'Product and commercial photography', 50 FROM public.occupations WHERE slug = 'photographer'
ON CONFLICT (occupation_id, name) DO UPDATE SET description = EXCLUDED.description, sort_order = EXCLUDED.sort_order;

-- Videographer
INSERT INTO public.occupation_services (occupation_id, name, description, sort_order)
SELECT id, 'Wedding Videography', 'Wedding video coverage', 10 FROM public.occupations WHERE slug = 'videographer'
UNION ALL SELECT id, 'Event Videography', 'Event video coverage', 20 FROM public.occupations WHERE slug = 'videographer'
UNION ALL SELECT id, 'Commercial Video', 'Commercial video production', 30 FROM public.occupations WHERE slug = 'videographer'
UNION ALL SELECT id, 'Social Media Video', 'Social media content', 40 FROM public.occupations WHERE slug = 'videographer'
UNION ALL SELECT id, 'Drone Videography', 'Aerial video', 50 FROM public.occupations WHERE slug = 'videographer'
ON CONFLICT (occupation_id, name) DO UPDATE SET description = EXCLUDED.description, sort_order = EXCLUDED.sort_order;

-- DJ
INSERT INTO public.occupation_services (occupation_id, name, description, sort_order)
SELECT id, 'Wedding DJ', 'Wedding DJ services', 10 FROM public.occupations WHERE slug = 'dj'
UNION ALL SELECT id, 'Party DJ', 'Party and celebration DJ', 20 FROM public.occupations WHERE slug = 'dj'
UNION ALL SELECT id, 'Corporate Event DJ', 'Corporate event DJ', 30 FROM public.occupations WHERE slug = 'dj'
UNION ALL SELECT id, 'Club DJ', 'Club and venue DJ', 40 FROM public.occupations WHERE slug = 'dj'
UNION ALL SELECT id, 'Mobile DJ', 'Mobile DJ services', 50 FROM public.occupations WHERE slug = 'dj'
ON CONFLICT (occupation_id, name) DO UPDATE SET description = EXCLUDED.description, sort_order = EXCLUDED.sort_order;

-- Chef
INSERT INTO public.occupation_services (occupation_id, name, description, sort_order)
SELECT id, 'Private Chef', 'In-home private chef', 10 FROM public.occupations WHERE slug = 'chef'
UNION ALL SELECT id, 'Meal Prep Chef', 'Meal preparation services', 20 FROM public.occupations WHERE slug = 'chef'
UNION ALL SELECT id, 'Dinner Party Chef', 'Dinner party catering', 30 FROM public.occupations WHERE slug = 'chef'
UNION ALL SELECT id, 'Event Catering', 'Event catering', 40 FROM public.occupations WHERE slug = 'chef'
UNION ALL SELECT id, 'Cooking Lessons', 'Cooking instruction', 50 FROM public.occupations WHERE slug = 'chef'
ON CONFLICT (occupation_id, name) DO UPDATE SET description = EXCLUDED.description, sort_order = EXCLUDED.sort_order;

-- Makeup Artist
INSERT INTO public.occupation_services (occupation_id, name, description, sort_order)
SELECT id, 'Bridal Makeup', 'Bridal makeup services', 10 FROM public.occupations WHERE slug = 'makeup-artist'
UNION ALL SELECT id, 'Event Makeup', 'Event and occasion makeup', 20 FROM public.occupations WHERE slug = 'makeup-artist'
UNION ALL SELECT id, 'Photoshoot Makeup', 'Photography makeup', 30 FROM public.occupations WHERE slug = 'makeup-artist'
UNION ALL SELECT id, 'Special Effects Makeup', 'SFX and theatrical makeup', 40 FROM public.occupations WHERE slug = 'makeup-artist'
UNION ALL SELECT id, 'Mobile Makeup', 'On-location makeup', 50 FROM public.occupations WHERE slug = 'makeup-artist'
ON CONFLICT (occupation_id, name) DO UPDATE SET description = EXCLUDED.description, sort_order = EXCLUDED.sort_order;

-- Barber
INSERT INTO public.occupation_services (occupation_id, name, description, sort_order)
SELECT id, 'Haircut', 'Haircut services', 10 FROM public.occupations WHERE slug = 'barber'
UNION ALL SELECT id, 'Beard Trim', 'Beard grooming', 20 FROM public.occupations WHERE slug = 'barber'
UNION ALL SELECT id, 'Kids Haircut', 'Children haircuts', 30 FROM public.occupations WHERE slug = 'barber'
UNION ALL SELECT id, 'Mobile Barber', 'On-location barber', 40 FROM public.occupations WHERE slug = 'barber'
UNION ALL SELECT id, 'Event Grooming', 'Event grooming services', 50 FROM public.occupations WHERE slug = 'barber'
ON CONFLICT (occupation_id, name) DO UPDATE SET description = EXCLUDED.description, sort_order = EXCLUDED.sort_order;

-- Mechanic
INSERT INTO public.occupation_services (occupation_id, name, description, sort_order)
SELECT id, 'Car Diagnostics', 'Vehicle diagnostics', 10 FROM public.occupations WHERE slug = 'mechanic'
UNION ALL SELECT id, 'Brake Repair', 'Brake system repair', 20 FROM public.occupations WHERE slug = 'mechanic'
UNION ALL SELECT id, 'Oil Change', 'Oil change services', 30 FROM public.occupations WHERE slug = 'mechanic'
UNION ALL SELECT id, 'Engine Repair', 'Engine repair', 40 FROM public.occupations WHERE slug = 'mechanic'
UNION ALL SELECT id, 'Mobile Mechanic', 'On-location mechanic', 50 FROM public.occupations WHERE slug = 'mechanic';

-- IT Technician
INSERT INTO public.occupation_services (occupation_id, name, description, sort_order)
SELECT id, 'Computer Repair', 'Computer repair services', 10 FROM public.occupations WHERE slug = 'it-technician'
UNION ALL SELECT id, 'Phone Repair', 'Phone and device repair', 20 FROM public.occupations WHERE slug = 'it-technician'
UNION ALL SELECT id, 'Network Setup', 'Network installation', 30 FROM public.occupations WHERE slug = 'it-technician'
UNION ALL SELECT id, 'Smart Home Installation', 'Smart home setup', 40 FROM public.occupations WHERE slug = 'it-technician'
UNION ALL SELECT id, 'Tech Support', 'Technical support', 50 FROM public.occupations WHERE slug = 'it-technician'
ON CONFLICT (occupation_id, name) DO UPDATE SET description = EXCLUDED.description, sort_order = EXCLUDED.sort_order;

-- Landscaper
INSERT INTO public.occupation_services (occupation_id, name, description, sort_order)
SELECT id, 'Lawn Care', 'Lawn maintenance', 10 FROM public.occupations WHERE slug = 'landscaper'
UNION ALL SELECT id, 'Garden Maintenance', 'Garden care', 20 FROM public.occupations WHERE slug = 'landscaper'
UNION ALL SELECT id, 'Tree Trimming', 'Tree and shrub care', 30 FROM public.occupations WHERE slug = 'landscaper'
UNION ALL SELECT id, 'Outdoor Design', 'Landscape design', 40 FROM public.occupations WHERE slug = 'landscaper'
UNION ALL SELECT id, 'Seasonal Cleanup', 'Seasonal yard cleanup', 50 FROM public.occupations WHERE slug = 'landscaper'
ON CONFLICT (occupation_id, name) DO UPDATE SET description = EXCLUDED.description, sort_order = EXCLUDED.sort_order;

-- Snow Removal
INSERT INTO public.occupation_services (occupation_id, name, description, sort_order)
SELECT id, 'Driveway Snow Removal', 'Driveway clearing', 10 FROM public.occupations WHERE slug = 'snow-removal'
UNION ALL SELECT id, 'Sidewalk Clearing', 'Sidewalk snow removal', 20 FROM public.occupations WHERE slug = 'snow-removal'
UNION ALL SELECT id, 'Roof Snow Removal', 'Roof snow removal', 30 FROM public.occupations WHERE slug = 'snow-removal'
UNION ALL SELECT id, 'Salting Service', 'Ice and snow salting', 40 FROM public.occupations WHERE slug = 'snow-removal'
UNION ALL SELECT id, 'Emergency Snow Removal', 'Emergency snow clearing', 50 FROM public.occupations WHERE slug = 'snow-removal'
ON CONFLICT (occupation_id, name) DO UPDATE SET description = EXCLUDED.description, sort_order = EXCLUDED.sort_order;

-- Painter
INSERT INTO public.occupation_services (occupation_id, name, description, sort_order)
SELECT id, 'Interior Painting', 'Interior paint services', 10 FROM public.occupations WHERE slug = 'painter'
UNION ALL SELECT id, 'Exterior Painting', 'Exterior paint services', 20 FROM public.occupations WHERE slug = 'painter'
UNION ALL SELECT id, 'Cabinet Painting', 'Cabinet refinishing', 30 FROM public.occupations WHERE slug = 'painter'
UNION ALL SELECT id, 'Drywall Painting', 'Drywall painting', 40 FROM public.occupations WHERE slug = 'painter'
UNION ALL SELECT id, 'Touch-up Painting', 'Touch-up and repair', 50 FROM public.occupations WHERE slug = 'painter';

-- Car Detailer
INSERT INTO public.occupation_services (occupation_id, name, description, sort_order)
SELECT id, 'Interior Detailing', 'Interior car detailing', 10 FROM public.occupations WHERE slug = 'car-detailer'
UNION ALL SELECT id, 'Exterior Wash', 'Exterior wash', 20 FROM public.occupations WHERE slug = 'car-detailer'
UNION ALL SELECT id, 'Full Detail', 'Complete detailing', 30 FROM public.occupations WHERE slug = 'car-detailer'
UNION ALL SELECT id, 'Ceramic Coating', 'Ceramic coating', 40 FROM public.occupations WHERE slug = 'car-detailer'
UNION ALL SELECT id, 'Mobile Car Detailing', 'On-location detailing', 50 FROM public.occupations WHERE slug = 'car-detailer'
ON CONFLICT (occupation_id, name) DO UPDATE SET description = EXCLUDED.description, sort_order = EXCLUDED.sort_order;

-- Home Organizer
INSERT INTO public.occupation_services (occupation_id, name, description, sort_order)
SELECT id, 'Closet Organization', 'Closet organizing', 10 FROM public.occupations WHERE slug = 'home-organizer'
UNION ALL SELECT id, 'Kitchen Organization', 'Kitchen organizing', 20 FROM public.occupations WHERE slug = 'home-organizer'
UNION ALL SELECT id, 'Garage Organization', 'Garage organizing', 30 FROM public.occupations WHERE slug = 'home-organizer'
UNION ALL SELECT id, 'Moving Organization', 'Moving and packing organization', 40 FROM public.occupations WHERE slug = 'home-organizer'
UNION ALL SELECT id, 'Decluttering', 'Decluttering services', 50 FROM public.occupations WHERE slug = 'home-organizer'
ON CONFLICT (occupation_id, name) DO UPDATE SET description = EXCLUDED.description, sort_order = EXCLUDED.sort_order;

-- Add occupation_id to service_pros for linking pros to occupations (optional, for future)
-- Mapping: occupation slug <-> service slug (cleaner->cleaning, handyman->handyman, etc.)
-- Pros are matched via primary_service_id / category_id to services; we query by occupation slug mapped to service slug
COMMENT ON TABLE public.occupations IS 'Occupation categories (Cleaner, Handyman, etc.) - top-level browse';
COMMENT ON TABLE public.occupation_services IS 'Services offered under each occupation';
