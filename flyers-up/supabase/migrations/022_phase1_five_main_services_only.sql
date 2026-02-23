-- ============================================
-- Phase 1: Only 5 main services visible
-- ============================================
-- Visible: Cleaning, Dog Walking/Pet Care, Event Organizer, Handyman, Photography
-- Hidden: Plumbing (subcategory under Handyman), Move Help, duplicate Dog Walking
-- ============================================

-- service_categories (legacy /customer/categories)
-- Hide plumbing, move-help, dog-walking
UPDATE public.service_categories SET is_active_phase1 = false WHERE slug IN ('plumbing', 'move-help', 'dog-walking');

-- Ensure only the 5 are active
UPDATE public.service_categories SET is_active_phase1 = true
WHERE slug IN ('cleaning', 'pet-care', 'event-organizer', 'handyman', 'photography');

-- services table (new /customer/services)
-- Hide move-help, dog-walking (plumbing already false)
UPDATE public.services SET is_active = false WHERE slug IN ('move-help', 'dog-walking');

-- Ensure the 5 are active
UPDATE public.services SET is_active = true
WHERE slug IN ('cleaning', 'pet-care', 'event-organizer', 'handyman', 'photography');
