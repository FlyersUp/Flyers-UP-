-- ============================================
-- ADD NEW SERVICE CATEGORIES
-- ============================================
-- This migration adds photographer and 5 additional
-- high-demand service categories to the database.
-- ============================================

-- Insert new service categories
INSERT INTO public.service_categories (slug, name, description, icon) VALUES
  ('photographer', 'Photographer', 'Professional photography services for events, portraits, and commercial', '📸'),
  ('hvac', 'HVAC', 'Heating, ventilation, and air conditioning installation and repair', '❄️'),
  ('roofing', 'Roofing', 'Roof installation, repair, and maintenance services', '🏠'),
  ('pest-control', 'Pest Control', 'Extermination and prevention of pests and insects', '🐛'),
  ('carpet-cleaning', 'Carpet Cleaning', 'Professional carpet and upholstery cleaning services', '🧽'),
  ('landscaping', 'Landscaping', 'Landscape design, installation, and maintenance', '🌳')
ON CONFLICT (slug) DO NOTHING;








