-- Immutable marketplace pricing snapshot per booking (cents, versioned).
-- Populated at booking creation; do not recompute fee lines from this snapshot at pay time
-- without using frozen core fees (see app: computeBookingPricing frozenCoreFeesCents).

ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS subtotal_cents integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS service_fee_cents integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS convenience_fee_cents integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS protection_fee_cents integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS fee_total_cents integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS customer_total_cents integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS stripe_estimated_fee_cents integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS platform_gross_margin_cents integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS effective_take_rate numeric(8,4),
  ADD COLUMN IF NOT EXISTS pricing_version text,
  ADD COLUMN IF NOT EXISTS pricing_band text,
  ADD COLUMN IF NOT EXISTS stripe_actual_fee_cents integer,
  ADD COLUMN IF NOT EXISTS contribution_margin_cents integer;

COMMENT ON COLUMN public.bookings.subtotal_cents IS 'Pro service subtotal at booking time (cents), before Flyers Up fees.';
COMMENT ON COLUMN public.bookings.fee_total_cents IS 'Snapshot: marketplace service + convenience + protection (cents) at creation; demand/promo may apply at pay.';
COMMENT ON COLUMN public.bookings.customer_total_cents IS 'Snapshot: subtotal + snapshot fee_total at creation; pay-time total may include demand/promo.';
COMMENT ON COLUMN public.bookings.pricing_version IS 'Immutable pricing engine version (e.g. v1_2026_04).';
COMMENT ON COLUMN public.bookings.pricing_band IS 'low | mid | high tier at snapshot time.';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'bookings_pricing_band_check'
  ) THEN
    ALTER TABLE public.bookings
      ADD CONSTRAINT bookings_pricing_band_check
      CHECK (pricing_band IS NULL OR pricing_band IN ('low', 'mid', 'high'));
  END IF;
END $$;
