-- ============================================
-- PRO PRICING & AVAILABILITY FIELDS
-- ============================================
-- Extends pro_profiles with pricing model, rates, travel rules, and availability toggles.
-- service_pros retains business_hours and service_radius for customer-facing display.
-- Safe to re-run (idempotent).

-- ============================================
-- 1. EXTEND PRO_PROFILES
-- ============================================
ALTER TABLE public.pro_profiles
  ADD COLUMN IF NOT EXISTS pricing_model TEXT DEFAULT 'flat' CHECK (pricing_model IN ('flat', 'hourly', 'hybrid')),
  ADD COLUMN IF NOT EXISTS starting_price NUMERIC,
  ADD COLUMN IF NOT EXISTS min_job_price NUMERIC,
  ADD COLUMN IF NOT EXISTS what_included TEXT,
  ADD COLUMN IF NOT EXISTS min_hours NUMERIC,
  ADD COLUMN IF NOT EXISTS overtime_rate NUMERIC,
  ADD COLUMN IF NOT EXISTS travel_fee_enabled BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS travel_fee_base NUMERIC,
  ADD COLUMN IF NOT EXISTS travel_free_within_miles NUMERIC,
  ADD COLUMN IF NOT EXISTS service_radius_miles NUMERIC,
  ADD COLUMN IF NOT EXISTS travel_extra_per_mile NUMERIC,
  ADD COLUMN IF NOT EXISTS same_day_bookings BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS emergency_available BOOLEAN DEFAULT false;

COMMENT ON COLUMN public.pro_profiles.pricing_model IS 'flat | hourly | hybrid';
COMMENT ON COLUMN public.pro_profiles.starting_price IS 'Flat fee starting price ($)';
COMMENT ON COLUMN public.pro_profiles.min_job_price IS 'Minimum job price ($)';
COMMENT ON COLUMN public.pro_profiles.what_included IS 'Short description of what is included';
COMMENT ON COLUMN public.pro_profiles.min_hours IS 'Minimum hours (hourly model)';
COMMENT ON COLUMN public.pro_profiles.overtime_rate IS 'Overtime rate $/hr';
COMMENT ON COLUMN public.pro_profiles.travel_fee_enabled IS 'Charge a travel fee';
COMMENT ON COLUMN public.pro_profiles.travel_fee_base IS 'Travel fee base ($)';
COMMENT ON COLUMN public.pro_profiles.travel_free_within_miles IS 'Free within X miles';
COMMENT ON COLUMN public.pro_profiles.service_radius_miles IS 'Max service radius (miles)';
COMMENT ON COLUMN public.pro_profiles.travel_extra_per_mile IS 'Extra $/mile beyond free range';
COMMENT ON COLUMN public.pro_profiles.same_day_bookings IS 'Accept same-day bookings';
COMMENT ON COLUMN public.pro_profiles.emergency_available IS 'Emergency availability';

-- Backfill: map existing hourly_rate/starting_rate into new schema
UPDATE public.pro_profiles
SET
  starting_price = COALESCE(starting_rate, starting_price),
  pricing_model = CASE
    WHEN hourly_rate IS NOT NULL AND hourly_rate > 0 AND (starting_rate IS NULL OR starting_rate = 0) THEN 'hourly'
    WHEN starting_rate IS NOT NULL AND starting_rate > 0 AND (hourly_rate IS NULL OR hourly_rate = 0) THEN 'flat'
    WHEN (hourly_rate IS NOT NULL AND hourly_rate > 0) AND (starting_rate IS NOT NULL AND starting_rate > 0) THEN 'hybrid'
    ELSE COALESCE(pricing_model, 'flat')
  END
WHERE pricing_model IS NULL OR starting_price IS NULL;
