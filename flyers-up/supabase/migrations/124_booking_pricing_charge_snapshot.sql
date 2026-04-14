-- Extended immutable pricing snapshot: charge model, pro earnings basis, platform revenue, demand multiplier.

ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS charge_model text,
  ADD COLUMN IF NOT EXISTS pro_earnings_cents integer,
  ADD COLUMN IF NOT EXISTS platform_revenue_cents integer,
  ADD COLUMN IF NOT EXISTS flat_fee_cents integer,
  ADD COLUMN IF NOT EXISTS hourly_rate_cents integer,
  ADD COLUMN IF NOT EXISTS base_fee_cents integer,
  ADD COLUMN IF NOT EXISTS included_hours numeric(6,2),
  ADD COLUMN IF NOT EXISTS overage_hourly_rate_cents integer,
  ADD COLUMN IF NOT EXISTS minimum_job_cents integer,
  ADD COLUMN IF NOT EXISTS demand_multiplier numeric(8,4);

COMMENT ON COLUMN public.bookings.charge_model IS 'flat | hourly | flat_hourly — frozen at booking time.';
COMMENT ON COLUMN public.bookings.pro_earnings_cents IS 'Pro service subtotal in cents (same as subtotal_cents when fees are on top).';
COMMENT ON COLUMN public.bookings.platform_revenue_cents IS 'Sum of customer-paid marketplace line items at snapshot (pre-Stripe processing).';
COMMENT ON COLUMN public.bookings.demand_multiplier IS 'Optional busy-time multiplier used with demand fee; null if none.';
