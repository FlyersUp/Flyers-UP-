-- Optional scope: tie add-ons / packages to a specific service_subcategories row (same service menu as booking).
-- compare_at_cents: optional "list" price for savings badge on packages (>= base when set).

ALTER TABLE public.service_addons
  ADD COLUMN IF NOT EXISTS service_subcategory_id UUID REFERENCES public.service_subcategories(id) ON DELETE SET NULL;

ALTER TABLE public.service_packages
  ADD COLUMN IF NOT EXISTS service_subcategory_id UUID REFERENCES public.service_subcategories(id) ON DELETE SET NULL;

ALTER TABLE public.service_packages
  ADD COLUMN IF NOT EXISTS compare_at_cents INTEGER CHECK (compare_at_cents IS NULL OR compare_at_cents >= 0);

CREATE INDEX IF NOT EXISTS idx_service_addons_subcategory_scope
  ON public.service_addons(pro_id, service_category, is_active)
  WHERE service_subcategory_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_service_packages_subcategory_scope
  ON public.service_packages(pro_user_id, is_active)
  WHERE service_subcategory_id IS NOT NULL;

COMMENT ON COLUMN public.service_addons.service_subcategory_id IS
  'When set, add-on only appears for bookings with this service type; NULL = all types in service_category.';
COMMENT ON COLUMN public.service_packages.service_subcategory_id IS
  'When set, package only for this service type; NULL = any type under the pro.';
COMMENT ON COLUMN public.service_packages.compare_at_cents IS
  'Optional higher list total (cents) to show savings vs base_price_cents.';
