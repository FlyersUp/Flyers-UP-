-- ============================================
-- Add subcategories to all 5 main services
-- ============================================
-- Expands subcategory coverage for: cleaning, pet-care, event-organizer, handyman, trainer-tutor
-- Uses same UPSERT pattern as migrations 020, 021, 027
-- ============================================

-- ============================================
-- CLEANING: Add more subcategories (had 3, now 8)
-- ============================================

INSERT INTO public.service_subcategories (service_id, slug, name, description, requires_license, sort_order)
SELECT s.id, 'post-construction-cleaning', 'Post-Construction Cleaning', 'Cleanup after renovations or construction', false, 40
FROM public.services s WHERE s.slug = 'cleaning' AND s.is_active
ON CONFLICT (service_id, slug) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, sort_order = EXCLUDED.sort_order;

INSERT INTO public.service_subcategories (service_id, slug, name, description, requires_license, sort_order)
SELECT s.id, 'office-commercial-cleaning', 'Office & Commercial Cleaning', 'Commercial spaces and offices', false, 50
FROM public.services s WHERE s.slug = 'cleaning' AND s.is_active
ON CONFLICT (service_id, slug) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, sort_order = EXCLUDED.sort_order;

INSERT INTO public.service_subcategories (service_id, slug, name, description, requires_license, sort_order)
SELECT s.id, 'recurring-cleaning', 'Recurring Cleaning', 'Weekly or bi-weekly regular cleaning', false, 60
FROM public.services s WHERE s.slug = 'cleaning' AND s.is_active
ON CONFLICT (service_id, slug) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, sort_order = EXCLUDED.sort_order;

INSERT INTO public.service_subcategories (service_id, slug, name, description, requires_license, sort_order)
SELECT s.id, 'laundry-service', 'Laundry & Linens', 'Washing, folding, and ironing', false, 70
FROM public.services s WHERE s.slug = 'cleaning' AND s.is_active
ON CONFLICT (service_id, slug) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, sort_order = EXCLUDED.sort_order;

INSERT INTO public.service_subcategories (service_id, slug, name, description, requires_license, sort_order)
SELECT s.id, 'organizing-decluttering', 'Organizing & Decluttering', 'Home organization and decluttering', false, 80
FROM public.services s WHERE s.slug = 'cleaning' AND s.is_active
ON CONFLICT (service_id, slug) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, sort_order = EXCLUDED.sort_order;

-- ============================================
-- PET-CARE: Add more subcategories (had 8, now 11)
-- ============================================

INSERT INTO public.service_subcategories (service_id, slug, name, description, requires_license, sort_order)
SELECT s.id, 'doggy-daycare-visit', 'Doggy Daycare Visit', 'Drop-in daycare-style care', false, 90
FROM public.services s WHERE s.slug = 'pet-care' AND s.is_active
ON CONFLICT (service_id, slug) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, sort_order = EXCLUDED.sort_order;

INSERT INTO public.service_subcategories (service_id, slug, name, description, requires_license, sort_order)
SELECT s.id, 'multi-pet-care', 'Multi-Pet Care', 'Care for multiple pets at once', false, 100
FROM public.services s WHERE s.slug = 'pet-care' AND s.is_active
ON CONFLICT (service_id, slug) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, sort_order = EXCLUDED.sort_order;

INSERT INTO public.service_subcategories (service_id, slug, name, description, requires_license, sort_order)
SELECT s.id, 'senior-pet-care', 'Senior Pet Care', 'Specialized care for older pets', false, 110
FROM public.services s WHERE s.slug = 'pet-care' AND s.is_active
ON CONFLICT (service_id, slug) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, sort_order = EXCLUDED.sort_order;

-- ============================================
-- EVENT-ORGANIZER: Add more subcategories (had 17, now 19)
-- ============================================

INSERT INTO public.service_subcategories (service_id, slug, name, description, requires_license, sort_order)
SELECT s.id, 'baby-shower', 'Baby Shower Planning', 'Baby shower and gender reveal events', false, 170
FROM public.services s WHERE s.slug = 'event-organizer' AND s.is_active
ON CONFLICT (service_id, slug) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, sort_order = EXCLUDED.sort_order;

INSERT INTO public.service_subcategories (service_id, slug, name, description, requires_license, sort_order)
SELECT s.id, 'graduation-party', 'Graduation Party Planning', 'Graduation and milestone celebrations', false, 180
FROM public.services s WHERE s.slug = 'event-organizer' AND s.is_active
ON CONFLICT (service_id, slug) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, sort_order = EXCLUDED.sort_order;

-- ============================================
-- HANDYMAN: Add more subcategories (had 8, now 11)
-- ============================================

INSERT INTO public.service_subcategories (service_id, slug, name, description, requires_license, sort_order)
SELECT s.id, 'painting-touch-ups', 'Painting & Touch-Ups', 'Interior painting and touch-ups', false, 90
FROM public.services s WHERE s.slug = 'handyman' AND s.is_active
ON CONFLICT (service_id, slug) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, sort_order = EXCLUDED.sort_order;

INSERT INTO public.service_subcategories (service_id, slug, name, description, requires_license, sort_order)
SELECT s.id, 'drywall-patching', 'Drywall Patching', 'Drywall repair and patching', false, 100
FROM public.services s WHERE s.slug = 'handyman' AND s.is_active
ON CONFLICT (service_id, slug) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, sort_order = EXCLUDED.sort_order;

INSERT INTO public.service_subcategories (service_id, slug, name, description, requires_license, sort_order)
SELECT s.id, 'smart-home-setup', 'Smart Home Setup', 'Smart devices and home automation', false, 110
FROM public.services s WHERE s.slug = 'handyman' AND s.is_active
ON CONFLICT (service_id, slug) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, sort_order = EXCLUDED.sort_order;

-- ============================================
-- TRAINER-TUTOR: Add more subcategories (had 17, now 20)
-- ============================================

INSERT INTO public.service_subcategories (service_id, slug, name, description, requires_license, sort_order, is_active)
SELECT s.id, 'ap-exam-prep', 'AP Exam Prep', 'Advanced Placement exam preparation', false, 180, true FROM public.services s WHERE s.slug = 'trainer-tutor'
ON CONFLICT (service_id, slug) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, sort_order = EXCLUDED.sort_order, is_active = EXCLUDED.is_active;

INSERT INTO public.service_subcategories (service_id, slug, name, description, requires_license, sort_order, is_active)
SELECT s.id, 'study-skills', 'Study Skills & Executive Function', 'Study strategies and organization', false, 190, true FROM public.services s WHERE s.slug = 'trainer-tutor'
ON CONFLICT (service_id, slug) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, sort_order = EXCLUDED.sort_order, is_active = EXCLUDED.is_active;

INSERT INTO public.service_subcategories (service_id, slug, name, description, requires_license, sort_order, is_active)
SELECT s.id, 'drama-acting', 'Drama & Acting Lessons', 'Theater and acting instruction', false, 200, true FROM public.services s WHERE s.slug = 'trainer-tutor'
ON CONFLICT (service_id, slug) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, sort_order = EXCLUDED.sort_order, is_active = EXCLUDED.is_active;
