-- Add subcategory_id to bookings so customers can specify which service type they want
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS subcategory_id UUID REFERENCES public.service_subcategories(id) ON DELETE SET NULL;
COMMENT ON COLUMN public.bookings.subcategory_id IS 'Customer-selected subcategory (e.g. 30-min walk, event photography)';
