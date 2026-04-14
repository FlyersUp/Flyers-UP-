-- Snapshot: demand fee line + billable hours estimate used for pricing.

ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS demand_fee_cents integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS actual_hours_estimate numeric(6,2);

COMMENT ON COLUMN public.bookings.demand_fee_cents IS 'Snapshot: busy-time / demand fee in cents at booking (0 if none).';
COMMENT ON COLUMN public.bookings.actual_hours_estimate IS 'Billable hours estimate used for hourly / flat_hourly snapshot; null if not applicable.';
