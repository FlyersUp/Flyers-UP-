-- ============================================
-- Photography + Dog Walking / Pet Care Services
-- ============================================
-- Upserts main services and subcategories.
-- No deletes; use is_active to hide. Slugs are stable.
-- ============================================

-- ============================================
-- 1. UPSERT MAIN SERVICES
-- ============================================

INSERT INTO public.services (slug, name, description, sort_order, is_active) VALUES
  ('photography', 'Photography', 'Professional photography services for events, portraits, real estate, and brands.', 40, true),
  ('pet-care', 'Dog Walking / Pet Care', 'Reliable dog walking and pet care services.', 20, true)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  sort_order = EXCLUDED.sort_order,
  is_active = EXCLUDED.is_active;

-- Ensure service_categories for backward compat (category_id mapping)
INSERT INTO public.service_categories (slug, name, description, icon, is_active_phase1)
VALUES
  ('photography', 'Photography', 'Professional photography services for events, portraits, real estate, and brands.', '📸', true),
  ('pet-care', 'Dog Walking / Pet Care', 'Reliable dog walking and pet care services.', '🐕', true)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  icon = EXCLUDED.icon,
  is_active_phase1 = true;

-- ============================================
-- 2. PHOTOGRAPHY SUBCATEGORIES
-- ============================================

INSERT INTO public.service_subcategories (service_id, slug, name, description, requires_license, sort_order)
SELECT s.id, 'event-photography', 'Event Photography', 'Parties, corporate events, celebrations.', false, 10
FROM public.services s WHERE s.slug = 'photography' AND s.is_active
ON CONFLICT (service_id, slug) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, sort_order = EXCLUDED.sort_order;

INSERT INTO public.service_subcategories (service_id, slug, name, description, requires_license, sort_order)
SELECT s.id, 'portrait-photography', 'Portrait Photography', 'Individual, couples, or lifestyle portraits.', false, 20
FROM public.services s WHERE s.slug = 'photography' AND s.is_active
ON CONFLICT (service_id, slug) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, sort_order = EXCLUDED.sort_order;

INSERT INTO public.service_subcategories (service_id, slug, name, description, requires_license, sort_order)
SELECT s.id, 'real-estate-photography', 'Real Estate Photography', 'Apartment and property listing photography.', false, 30
FROM public.services s WHERE s.slug = 'photography' AND s.is_active
ON CONFLICT (service_id, slug) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, sort_order = EXCLUDED.sort_order;

INSERT INTO public.service_subcategories (service_id, slug, name, description, requires_license, sort_order)
SELECT s.id, 'product-photography', 'Product Photography', 'Studio or lifestyle product shoots.', false, 40
FROM public.services s WHERE s.slug = 'photography' AND s.is_active
ON CONFLICT (service_id, slug) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, sort_order = EXCLUDED.sort_order;

INSERT INTO public.service_subcategories (service_id, slug, name, description, requires_license, sort_order)
SELECT s.id, 'corporate-headshots', 'Corporate Headshots', 'Professional headshots for business use.', false, 50
FROM public.services s WHERE s.slug = 'photography' AND s.is_active
ON CONFLICT (service_id, slug) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, sort_order = EXCLUDED.sort_order;

INSERT INTO public.service_subcategories (service_id, slug, name, description, requires_license, sort_order)
SELECT s.id, 'wedding-photography', 'Wedding Photography', 'Full or partial wedding day coverage.', false, 60
FROM public.services s WHERE s.slug = 'photography' AND s.is_active
ON CONFLICT (service_id, slug) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, sort_order = EXCLUDED.sort_order;

INSERT INTO public.service_subcategories (service_id, slug, name, description, requires_license, sort_order)
SELECT s.id, 'branding-shoot', 'Branding / Personal Brand Shoots', 'Content for entrepreneurs and creators.', false, 70
FROM public.services s WHERE s.slug = 'photography' AND s.is_active
ON CONFLICT (service_id, slug) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, sort_order = EXCLUDED.sort_order;

INSERT INTO public.service_subcategories (service_id, slug, name, description, requires_license, sort_order)
SELECT s.id, 'family-maternity', 'Family / Maternity Photography', 'Family sessions and maternity shoots.', false, 80
FROM public.services s WHERE s.slug = 'photography' AND s.is_active
ON CONFLICT (service_id, slug) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, sort_order = EXCLUDED.sort_order;

-- ============================================
-- 3. PET CARE SUBCATEGORIES
-- ============================================

INSERT INTO public.service_subcategories (service_id, slug, name, description, requires_license, sort_order)
SELECT s.id, '30-min-walk', '30-Minute Dog Walk', 'Standard neighborhood walk.', false, 10
FROM public.services s WHERE s.slug = 'pet-care' AND s.is_active
ON CONFLICT (service_id, slug) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, sort_order = EXCLUDED.sort_order;

INSERT INTO public.service_subcategories (service_id, slug, name, description, requires_license, sort_order)
SELECT s.id, '60-min-walk', '60-Minute Dog Walk', 'Extended exercise walk.', false, 20
FROM public.services s WHERE s.slug = 'pet-care' AND s.is_active
ON CONFLICT (service_id, slug) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, sort_order = EXCLUDED.sort_order;

INSERT INTO public.service_subcategories (service_id, slug, name, description, requires_license, sort_order)
SELECT s.id, 'recurring-weekly-walk', 'Recurring Weekly Walks', 'Scheduled weekly recurring walks.', false, 30
FROM public.services s WHERE s.slug = 'pet-care' AND s.is_active
ON CONFLICT (service_id, slug) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, sort_order = EXCLUDED.sort_order;

INSERT INTO public.service_subcategories (service_id, slug, name, description, requires_license, sort_order)
SELECT s.id, 'pet-sitting', 'Pet Sitting (In-Home)', 'Care for pets in your home.', false, 40
FROM public.services s WHERE s.slug = 'pet-care' AND s.is_active
ON CONFLICT (service_id, slug) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, sort_order = EXCLUDED.sort_order;

INSERT INTO public.service_subcategories (service_id, slug, name, description, requires_license, sort_order)
SELECT s.id, 'overnight-care', 'Overnight Pet Care', 'Overnight stay with your pet.', false, 50
FROM public.services s WHERE s.slug = 'pet-care' AND s.is_active
ON CONFLICT (service_id, slug) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, sort_order = EXCLUDED.sort_order;

INSERT INTO public.service_subcategories (service_id, slug, name, description, requires_license, sort_order)
SELECT s.id, 'puppy-care', 'Puppy Care Visits', 'Short visits for young dogs.', false, 60
FROM public.services s WHERE s.slug = 'pet-care' AND s.is_active
ON CONFLICT (service_id, slug) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, sort_order = EXCLUDED.sort_order;

INSERT INTO public.service_subcategories (service_id, slug, name, description, requires_license, sort_order)
SELECT s.id, 'cat-care', 'Cat Sitting', 'Feeding and care for cats.', false, 70
FROM public.services s WHERE s.slug = 'pet-care' AND s.is_active
ON CONFLICT (service_id, slug) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, sort_order = EXCLUDED.sort_order;

INSERT INTO public.service_subcategories (service_id, slug, name, description, requires_license, sort_order)
SELECT s.id, 'medication-support', 'Pet Medication Support', 'Basic medication administration (non-veterinary).', false, 80
FROM public.services s WHERE s.slug = 'pet-care' AND s.is_active
ON CONFLICT (service_id, slug) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, sort_order = EXCLUDED.sort_order;
