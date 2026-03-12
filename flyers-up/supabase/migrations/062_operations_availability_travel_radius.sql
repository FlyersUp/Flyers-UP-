-- ============================================
-- OPERATIONS: Availability + Travel Radius
-- ============================================
-- Pro availability rules, travel radius, lead time, buffers
-- ============================================

-- service_pros: availability + travel fields
ALTER TABLE public.service_pros
  ADD COLUMN IF NOT EXISTS travel_radius_miles NUMERIC,
  ADD COLUMN IF NOT EXISTS service_area_mode TEXT DEFAULT 'radius' CHECK (service_area_mode IS NULL OR service_area_mode IN ('radius', 'boroughs', 'zip_codes')),
  ADD COLUMN IF NOT EXISTS service_area_values TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS lead_time_minutes INTEGER DEFAULT 60,
  ADD COLUMN IF NOT EXISTS buffer_between_jobs_minutes INTEGER DEFAULT 30,
  ADD COLUMN IF NOT EXISTS same_day_enabled BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS availability_rules JSONB DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.service_pros.travel_radius_miles IS 'Max travel distance from pro location';
COMMENT ON COLUMN public.service_pros.service_area_mode IS 'radius | boroughs | zip_codes';
COMMENT ON COLUMN public.service_pros.service_area_values IS 'Borough names or zip codes when mode is boroughs/zip_codes';
COMMENT ON COLUMN public.service_pros.lead_time_minutes IS 'Min minutes from now to first available slot';
COMMENT ON COLUMN public.service_pros.buffer_between_jobs_minutes IS 'Buffer between consecutive bookings';
COMMENT ON COLUMN public.service_pros.same_day_enabled IS 'Allow same-day bookings';
COMMENT ON COLUMN public.service_pros.availability_rules IS 'JSON: blocked_dates, blackout_ranges, custom rules';

-- pro_profiles may have service_radius_miles - sync if needed
UPDATE public.service_pros sp
SET travel_radius_miles = COALESCE(sp.travel_radius_miles, pp.service_radius_miles)
FROM public.pro_profiles pp
WHERE pp.user_id = sp.user_id
  AND sp.travel_radius_miles IS NULL
  AND pp.service_radius_miles IS NOT NULL;

-- blocked_dates table for explicit date blocks
CREATE TABLE IF NOT EXISTS public.pro_blocked_dates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pro_id UUID NOT NULL REFERENCES public.service_pros(id) ON DELETE CASCADE,
  blocked_date DATE NOT NULL,
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(pro_id, blocked_date)
);

CREATE INDEX IF NOT EXISTS idx_pro_blocked_dates_pro_date ON public.pro_blocked_dates(pro_id, blocked_date);

ALTER TABLE public.pro_blocked_dates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Pros manage own blocked dates" ON public.pro_blocked_dates;
CREATE POLICY "Pros manage own blocked dates"
  ON public.pro_blocked_dates FOR ALL TO authenticated
  USING (pro_id IN (SELECT id FROM public.service_pros WHERE user_id = auth.uid()))
  WITH CHECK (pro_id IN (SELECT id FROM public.service_pros WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Public read blocked dates" ON public.pro_blocked_dates;
CREATE POLICY "Public read blocked dates"
  ON public.pro_blocked_dates FOR SELECT TO authenticated
  USING (true);

-- booking_availability_holds: prevent overlapping bookings
CREATE TABLE IF NOT EXISTS public.booking_availability_holds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  pro_id UUID NOT NULL REFERENCES public.service_pros(id) ON DELETE CASCADE,
  hold_start_at TIMESTAMPTZ NOT NULL,
  hold_end_at TIMESTAMPTZ NOT NULL,
  includes_travel_buffer BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_booking_holds_pro_range ON public.booking_availability_holds(pro_id, hold_start_at, hold_end_at);

ALTER TABLE public.booking_availability_holds ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role manages holds" ON public.booking_availability_holds;
-- Holds managed by backend only; RLS allows read for participants
DROP POLICY IF EXISTS "Participants view holds" ON public.booking_availability_holds;
CREATE POLICY "Participants view holds"
  ON public.booking_availability_holds FOR SELECT TO authenticated
  USING (
    pro_id IN (SELECT id FROM public.service_pros WHERE user_id = auth.uid())
    OR booking_id IN (SELECT id FROM public.bookings WHERE customer_id = auth.uid())
  );
