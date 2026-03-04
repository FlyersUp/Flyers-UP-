-- ============================================
-- BOOKING PAYMENT BREAKDOWN COLUMNS
-- ============================================
-- Optional columns for storing quote breakdown when payment is created.
-- Safe to re-run (idempotent).

ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS amount_subtotal INTEGER,
  ADD COLUMN IF NOT EXISTS amount_platform_fee INTEGER,
  ADD COLUMN IF NOT EXISTS amount_travel_fee INTEGER,
  ADD COLUMN IF NOT EXISTS amount_total INTEGER,
  ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'usd';

COMMENT ON COLUMN public.bookings.amount_subtotal IS 'Subtotal in cents (base + travel)';
COMMENT ON COLUMN public.bookings.amount_platform_fee IS 'Platform fee in cents';
COMMENT ON COLUMN public.bookings.amount_travel_fee IS 'Travel fee in cents';
COMMENT ON COLUMN public.bookings.amount_total IS 'Total in cents';
COMMENT ON COLUMN public.bookings.currency IS 'Currency code (e.g. usd)';
