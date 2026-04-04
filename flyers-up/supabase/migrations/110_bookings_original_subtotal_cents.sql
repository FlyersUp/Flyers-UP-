-- Raw pro subtotal before minimum enforcement (cents). Null = legacy row (pre-minimum feature).

ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS original_subtotal_cents integer;

COMMENT ON COLUMN public.bookings.original_subtotal_cents IS 'Pro subtotal from pricing/package before MIN_BOOKING_SUBTOTAL enforcement; null for legacy bookings.';
