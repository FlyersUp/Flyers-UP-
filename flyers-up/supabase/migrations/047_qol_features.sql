-- ============================================
-- QoL FEATURES: Live job tracking, favorites, badges, notifications, issues, availability
-- ============================================
-- Safe to re-run (idempotent).
-- ============================================

-- 1. BOOKINGS: Add arrived_at, extend status for arrived + review_pending
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS arrived_at TIMESTAMPTZ NULL;
COMMENT ON COLUMN public.bookings.arrived_at IS 'When pro indicated they arrived at location';

-- Include ALL statuses from prior migrations (042, 20250304120000) plus new: arrived, review_pending
-- Must not violate existing rows; add new statuses to the allowed list.
ALTER TABLE public.bookings DROP CONSTRAINT IF EXISTS bookings_status_check;
ALTER TABLE public.bookings
  ADD CONSTRAINT bookings_status_check
  CHECK (status IN (
    'requested', 'accepted', 'pending', 'payment_required', 'deposit_paid', 'fully_paid',
    'pending_pro_acceptance', 'awaiting_deposit_payment', 'on_the_way', 'pro_en_route',
    'arrived', 'in_progress', 'completed_pending_payment', 'awaiting_payment',
    'work_completed_by_pro', 'awaiting_remaining_payment', 'awaiting_customer_confirmation',
    'completed', 'review_pending', 'paid',
    'expired_unpaid', 'cancelled', 'declined',
    'cancelled_expired', 'cancelled_by_customer', 'cancelled_by_pro', 'cancelled_admin'
  ));

-- 2. FAVORITE PROS
CREATE TABLE IF NOT EXISTS public.favorite_pros (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  pro_id UUID NOT NULL REFERENCES public.service_pros(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(customer_id, pro_id)
);
CREATE INDEX IF NOT EXISTS idx_favorite_pros_customer ON public.favorite_pros(customer_id);
ALTER TABLE public.favorite_pros ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Customers manage own favorites" ON public.favorite_pros;
CREATE POLICY "Customers manage own favorites"
  ON public.favorite_pros FOR ALL TO authenticated
  USING (customer_id = auth.uid()) WITH CHECK (customer_id = auth.uid());

-- 3. SERVICE_PROSPRO: Verified badges (identity, background, licensed, jobs_completed)
ALTER TABLE public.service_pros ADD COLUMN IF NOT EXISTS identity_verified BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.service_pros ADD COLUMN IF NOT EXISTS background_checked BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.service_pros ADD COLUMN IF NOT EXISTS licensed BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.service_pros ADD COLUMN IF NOT EXISTS jobs_completed INTEGER NOT NULL DEFAULT 0;
COMMENT ON COLUMN public.service_pros.identity_verified IS 'Identity verified badge';
COMMENT ON COLUMN public.service_pros.background_checked IS 'Background check passed';
COMMENT ON COLUMN public.service_pros.licensed IS 'Licensed professional';
COMMENT ON COLUMN public.service_pros.jobs_completed IS 'Total completed jobs count';

-- 4. PRO_PROFILES + SERVICE_PROSPRO: same_day_available for search filter
ALTER TABLE public.pro_profiles ADD COLUMN IF NOT EXISTS same_day_available BOOLEAN DEFAULT false;
UPDATE public.pro_profiles SET same_day_available = COALESCE(same_day_bookings, false);
ALTER TABLE public.service_pros ADD COLUMN IF NOT EXISTS same_day_available BOOLEAN DEFAULT false;
UPDATE public.service_pros sp
SET same_day_available = COALESCE(pp.same_day_bookings, pp.same_day_available, false)
FROM public.pro_profiles pp
WHERE pp.user_id = sp.user_id;

-- 5. NOTIFICATIONS: Add message column if missing (034 has title, body)
-- 034 already has: id, user_id, type, title, body, booking_id, deep_link, read, created_at
-- User spec wants: message - we use body. No change needed.

-- 6. BOOKING_ISSUES
CREATE TABLE IF NOT EXISTS public.booking_issues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  issue_type TEXT NOT NULL CHECK (issue_type IN ('pro_late', 'work_incomplete', 'wrong_service', 'contact_support')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_booking_issues_booking ON public.booking_issues(booking_id);
ALTER TABLE public.booking_issues ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can insert own booking issues" ON public.booking_issues;
CREATE POLICY "Users can insert own booking issues"
  ON public.booking_issues FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
DROP POLICY IF EXISTS "Admins can view booking issues" ON public.booking_issues;
CREATE POLICY "Admins can view booking issues"
  ON public.booking_issues FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));

-- 7. PRO_AVAILABILITY (slots)
CREATE TABLE IF NOT EXISTS public.pro_availability (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pro_id UUID NOT NULL REFERENCES public.service_pros(id) ON DELETE CASCADE,
  day_of_week SMALLINT NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_pro_availability_pro_day ON public.pro_availability(pro_id, day_of_week);
ALTER TABLE public.pro_availability ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Pros manage own availability" ON public.pro_availability;
CREATE POLICY "Pros manage own availability"
  ON public.pro_availability FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.service_pros sp WHERE sp.id = pro_id AND sp.user_id = auth.uid())
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.service_pros sp WHERE sp.id = pro_id AND sp.user_id = auth.uid())
  );
DROP POLICY IF EXISTS "Public can read pro availability" ON public.pro_availability;
CREATE POLICY "Public can read pro availability"
  ON public.pro_availability FOR SELECT TO authenticated
  USING (true);
