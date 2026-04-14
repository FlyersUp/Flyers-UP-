-- Pricing UI flags referenced by checkout / pay / accept-quote routes (were missing from schema).

ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS flat_fee_selected boolean,
  ADD COLUMN IF NOT EXISTS hourly_selected boolean;

COMMENT ON COLUMN public.bookings.flat_fee_selected IS 'True when customer chose flat/package-style pricing for this booking.';
COMMENT ON COLUMN public.bookings.hourly_selected IS 'True when customer chose hourly pricing for this booking.';
