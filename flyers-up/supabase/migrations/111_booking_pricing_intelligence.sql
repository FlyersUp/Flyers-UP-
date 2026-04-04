-- Optional pricing intelligence for analytics / future optimization (cents + flags).

ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS suggested_price_cents integer,
  ADD COLUMN IF NOT EXISTS was_below_suggestion boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS was_below_minimum boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.bookings.suggested_price_cents IS 'Platform suggested list price (cents) at booking creation from occupation + duration (+ optional signals).';
COMMENT ON COLUMN public.bookings.was_below_suggestion IS 'True when raw pro subtotal was below suggested_price_cents at creation.';
COMMENT ON COLUMN public.bookings.was_below_minimum IS 'True when subtotal was raised to occupation minimum (adjust mode).';
