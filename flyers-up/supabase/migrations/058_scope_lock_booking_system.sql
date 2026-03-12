-- ============================================
-- SCOPE LOCK BOOKING SYSTEM
-- ============================================
-- Protects Pros from underpriced or misrepresented jobs.
-- Deposit cannot be charged until scope is confirmed.
-- ============================================

-- 1. JOB_REQUESTS: Structured job details + photo categories + AI estimate
ALTER TABLE public.job_requests
  ADD COLUMN IF NOT EXISTS job_details JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS photos_categorized JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS ai_estimate_low NUMERIC,
  ADD COLUMN IF NOT EXISTS ai_estimate_high NUMERIC,
  ADD COLUMN IF NOT EXISTS selected_offer_id UUID REFERENCES public.job_offers(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS booking_id UUID REFERENCES public.bookings(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.job_requests.job_details IS 'Structured: home_size_sqft, bedrooms, bathrooms, cleaning_type, condition, pets, addons';
COMMENT ON COLUMN public.job_requests.photos_categorized IS 'Array of {category, url}: kitchen, bathroom, main_room, problem_areas';
COMMENT ON COLUMN public.job_requests.ai_estimate_low IS 'AI price estimate low ($)';
COMMENT ON COLUMN public.job_requests.ai_estimate_high IS 'AI price estimate high ($)';

-- 2. JOB_OFFERS: Estimated time, rating (from pro at offer time)
ALTER TABLE public.job_offers
  ADD COLUMN IF NOT EXISTS estimated_time_hours NUMERIC,
  ADD COLUMN IF NOT EXISTS pro_rating_at_offer NUMERIC;

COMMENT ON COLUMN public.job_offers.estimated_time_hours IS 'Pro estimated job duration in hours';
COMMENT ON COLUMN public.job_offers.pro_rating_at_offer IS 'Pro rating snapshot when offer was made';

-- 3. BOOKINGS: Scope lock + job request link
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS job_request_id UUID REFERENCES public.job_requests(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS job_offer_id UUID REFERENCES public.job_offers(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS scope_confirmed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS scope_confirmed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS job_details_snapshot JSONB,
  ADD COLUMN IF NOT EXISTS photos_snapshot JSONB;

COMMENT ON COLUMN public.bookings.scope_confirmed_at IS 'When customer confirmed scope - REQUIRED before deposit';
COMMENT ON COLUMN public.bookings.scope_confirmed_by IS 'Customer who confirmed scope';
COMMENT ON COLUMN public.bookings.job_details_snapshot IS 'Snapshot of job_details at scope lock';
COMMENT ON COLUMN public.bookings.photos_snapshot IS 'Snapshot of photos at scope lock';

CREATE INDEX IF NOT EXISTS idx_bookings_job_request ON public.bookings(job_request_id);
CREATE INDEX IF NOT EXISTS idx_bookings_scope_confirmed ON public.bookings(scope_confirmed_at);

-- 4. PRICE_ADJUSTMENTS: Pro reports job mismatch on arrival
CREATE TABLE IF NOT EXISTS public.price_adjustments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  pro_id UUID NOT NULL REFERENCES public.service_pros(id) ON DELETE CASCADE,
  reason TEXT NOT NULL CHECK (reason IN (
    'larger_space', 'extra_rooms', 'heavy_condition', 'additional_tasks', 'safety_concern'
  )),
  original_price_cents INTEGER NOT NULL,
  new_price_cents INTEGER NOT NULL,
  message TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  customer_response_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_price_adjustments_booking ON public.price_adjustments(booking_id);
CREATE INDEX IF NOT EXISTS idx_price_adjustments_pro ON public.price_adjustments(pro_id);

ALTER TABLE public.price_adjustments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Participants view price adjustments" ON public.price_adjustments;
CREATE POLICY "Participants view price adjustments"
  ON public.price_adjustments FOR SELECT TO authenticated
  USING (
    booking_id IN (
      SELECT b.id FROM public.bookings b
      WHERE b.customer_id = auth.uid()
         OR b.pro_id IN (SELECT id FROM public.service_pros WHERE user_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "Pros insert price adjustments" ON public.price_adjustments;
CREATE POLICY "Pros insert price adjustments"
  ON public.price_adjustments FOR INSERT TO authenticated
  WITH CHECK (
    pro_id IN (SELECT id FROM public.service_pros WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Customers update price adjustments response" ON public.price_adjustments;
CREATE POLICY "Customers update price adjustments response"
  ON public.price_adjustments FOR UPDATE TO authenticated
  USING (
    booking_id IN (SELECT id FROM public.bookings WHERE customer_id = auth.uid())
  )
  WITH CHECK (status IN ('accepted', 'rejected'));

-- 5. CUSTOMER_MISREPRESENTATION_SCORES: Track mismatch events
CREATE TABLE IF NOT EXISTS public.customer_misrepresentation_scores (
  customer_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  mismatch_count INTEGER NOT NULL DEFAULT 0,
  last_mismatch_at TIMESTAMPTZ,
  warning_at TIMESTAMPTZ,
  restricted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.customer_misrepresentation_scores IS '0-2=normal, 3=warning, 5=restrictions';

ALTER TABLE public.customer_misrepresentation_scores ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Customers view own misrepresentation score" ON public.customer_misrepresentation_scores;
CREATE POLICY "Customers view own misrepresentation score"
  ON public.customer_misrepresentation_scores FOR SELECT TO authenticated
  USING (customer_id = auth.uid());

DROP POLICY IF EXISTS "Admins manage misrepresentation scores" ON public.customer_misrepresentation_scores;
CREATE POLICY "Admins manage misrepresentation scores"
  ON public.customer_misrepresentation_scores FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- 6. PRO_PROFILES: Minimum job settings (filter job feed)
ALTER TABLE public.pro_profiles
  ADD COLUMN IF NOT EXISTS min_job_price NUMERIC,
  ADD COLUMN IF NOT EXISTS min_hourly_rate NUMERIC,
  ADD COLUMN IF NOT EXISTS min_travel_distance_miles NUMERIC;

COMMENT ON COLUMN public.pro_profiles.min_job_price IS 'Jobs below this price do not appear in Pro feed';
COMMENT ON COLUMN public.pro_profiles.min_hourly_rate IS 'Minimum hourly rate for job visibility';
COMMENT ON COLUMN public.pro_profiles.min_travel_distance_miles IS 'Minimum travel distance (jobs closer excluded)';

-- 7. Admin policies for analytics
DROP POLICY IF EXISTS "Admins select price adjustments" ON public.price_adjustments;
CREATE POLICY "Admins select price adjustments"
  ON public.price_adjustments FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- 8. Trigger: increment misrepresentation score when price adjustment accepted
CREATE OR REPLACE FUNCTION public.increment_misrepresentation_on_adjustment()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'accepted' AND (OLD.status IS NULL OR OLD.status != 'accepted') THEN
    INSERT INTO public.customer_misrepresentation_scores (customer_id, mismatch_count, last_mismatch_at, updated_at)
    SELECT b.customer_id, 1, now(), now()
    FROM public.bookings b WHERE b.id = NEW.booking_id
    ON CONFLICT (customer_id) DO UPDATE SET
      mismatch_count = customer_misrepresentation_scores.mismatch_count + 1,
      last_mismatch_at = now(),
      warning_at = CASE WHEN customer_misrepresentation_scores.mismatch_count + 1 >= 3 THEN now() ELSE customer_misrepresentation_scores.warning_at END,
      restricted_at = CASE WHEN customer_misrepresentation_scores.mismatch_count + 1 >= 5 THEN now() ELSE customer_misrepresentation_scores.restricted_at END,
      updated_at = now();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_price_adjustment_misrepresentation ON public.price_adjustments;
CREATE TRIGGER trg_price_adjustment_misrepresentation
  AFTER UPDATE ON public.price_adjustments
  FOR EACH ROW EXECUTE FUNCTION public.increment_misrepresentation_on_adjustment();

-- 9. SCOPE_LOCK_ANALYTICS: Admin view for mismatch/price analytics
CREATE OR REPLACE VIEW public.admin_scope_lock_analytics AS
SELECT
  (SELECT COUNT(*) FROM public.price_adjustments) AS total_mismatches,
  (SELECT COUNT(*) FROM public.bookings WHERE scope_confirmed_at IS NOT NULL) AS scope_confirmed_count,
  (SELECT COUNT(*) FROM public.bookings WHERE job_request_id IS NOT NULL AND scope_confirmed_at IS NULL AND status NOT IN ('cancelled', 'declined')) AS pending_scope_count,
  (SELECT COALESCE(AVG((pa.new_price_cents - pa.original_price_cents)::numeric / 100), 0)
   FROM public.price_adjustments pa WHERE pa.status = 'accepted') AS avg_price_adjustment_dollars,
  (SELECT COUNT(*) FROM public.customer_misrepresentation_scores WHERE mismatch_count >= 3) AS frequent_misrepresentation_count,
  (SELECT COALESCE(AVG(b.price), 0) FROM public.bookings b WHERE b.price IS NOT NULL AND b.status NOT IN ('cancelled', 'declined')) AS avg_job_price;
