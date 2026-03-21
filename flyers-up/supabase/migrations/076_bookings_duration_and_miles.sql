-- Used by booking quote / deposit APIs (computeQuote, checkout-quote, pay/deposit).
-- Production was failing with: column bookings.duration_hours does not exist (42703).

ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS duration_hours NUMERIC(6, 2) NULL;

ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS miles_distance NUMERIC(8, 2) NULL;

COMMENT ON COLUMN public.bookings.duration_hours IS 'Job duration in hours (hourly/hybrid pricing).';
COMMENT ON COLUMN public.bookings.miles_distance IS 'Distance for travel fee calculation.';
