-- Identity only: occupation/category context at booking creation (audit / Stripe metadata).
-- Fee amounts are still computed from live category display name + existing fee-rules inference — not from these columns.

ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS fee_profile text;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS pricing_occupation_slug text;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS pricing_category_slug text;

ALTER TABLE public.bookings DROP CONSTRAINT IF EXISTS bookings_fee_profile_check;
ALTER TABLE public.bookings
  ADD CONSTRAINT bookings_fee_profile_check
  CHECK (
    fee_profile IS NULL
    OR fee_profile IN ('light', 'standard', 'premium_trust')
  );

COMMENT ON COLUMN public.bookings.fee_profile IS 'Identity: inferred profile label at booking creation; does not drive fee math.';
COMMENT ON COLUMN public.bookings.pricing_occupation_slug IS 'Identity: occupations.slug when bound; optional.';
COMMENT ON COLUMN public.bookings.pricing_category_slug IS 'Identity: service_categories.slug at booking time; optional.';
