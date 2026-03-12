-- ============================================
-- MARKETPLACE TRUST SYSTEMS
-- ============================================
-- 1. Arrival Verification (job_arrivals)
-- 2. Reputation Depth (pro_reputation)
-- 3. Instant Rebook (rebook_events)
-- 4. Job Completed Flyer (job_completions)
-- ============================================

-- BOOKINGS: Add address coords for arrival verification
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS address_lat DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS address_lng DOUBLE PRECISION;

COMMENT ON COLUMN public.bookings.address_lat IS 'Job address latitude for arrival verification';
COMMENT ON COLUMN public.bookings.address_lng IS 'Job address longitude for arrival verification';

-- 1. JOB_ARRIVALS: GPS + photo when Pro starts job
CREATE TABLE IF NOT EXISTS public.job_arrivals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  pro_id UUID NOT NULL REFERENCES public.service_pros(id) ON DELETE CASCADE,
  arrival_lat DOUBLE PRECISION NOT NULL,
  arrival_lng DOUBLE PRECISION NOT NULL,
  arrival_timestamp TIMESTAMPTZ NOT NULL DEFAULT now(),
  arrival_photo_url TEXT,
  location_verified BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(booking_id)
);

CREATE INDEX IF NOT EXISTS idx_job_arrivals_booking ON public.job_arrivals(booking_id);
CREATE INDEX IF NOT EXISTS idx_job_arrivals_pro ON public.job_arrivals(pro_id);

ALTER TABLE public.job_arrivals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Participants view job arrivals" ON public.job_arrivals;
CREATE POLICY "Participants view job arrivals"
  ON public.job_arrivals FOR SELECT TO authenticated
  USING (
    booking_id IN (
      SELECT b.id FROM public.bookings b
      WHERE b.customer_id = auth.uid()
         OR b.pro_id IN (SELECT id FROM public.service_pros WHERE user_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "Pros insert job arrivals" ON public.job_arrivals;
CREATE POLICY "Pros insert job arrivals"
  ON public.job_arrivals FOR INSERT TO authenticated
  WITH CHECK (
    pro_id IN (SELECT id FROM public.service_pros WHERE user_id = auth.uid())
  );

-- 2. PRO_REPUTATION: Deeper metrics (materialized/updated by trigger or cron)
CREATE TABLE IF NOT EXISTS public.pro_reputation (
  pro_id UUID PRIMARY KEY REFERENCES public.service_pros(id) ON DELETE CASCADE,
  jobs_completed INTEGER NOT NULL DEFAULT 0,
  average_rating NUMERIC NOT NULL DEFAULT 0,
  on_time_rate NUMERIC NOT NULL DEFAULT 0,
  scope_accuracy_rate NUMERIC NOT NULL DEFAULT 0,
  repeat_customer_rate NUMERIC NOT NULL DEFAULT 0,
  completion_rate NUMERIC NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON COLUMN public.pro_reputation.on_time_rate IS 'Pct of jobs started within 15 min of scheduled time';
COMMENT ON COLUMN public.pro_reputation.scope_accuracy_rate IS 'Pct of jobs completed without price adjustment';
COMMENT ON COLUMN public.pro_reputation.repeat_customer_rate IS 'Pct of customers who rebook same pro';
COMMENT ON COLUMN public.pro_reputation.completion_rate IS 'jobs_finished / jobs_accepted';

CREATE INDEX IF NOT EXISTS idx_pro_reputation_rating ON public.pro_reputation(average_rating DESC);

ALTER TABLE public.pro_reputation ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view pro reputation" ON public.pro_reputation;
CREATE POLICY "Anyone can view pro reputation"
  ON public.pro_reputation FOR SELECT TO authenticated, anon
  USING (true);

DROP POLICY IF EXISTS "Service role updates pro reputation" ON public.pro_reputation;
-- Admins/cron update via service role

-- 3. REBOOK_EVENTS: Track instant rebook actions
CREATE TABLE IF NOT EXISTS public.rebook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  pro_id UUID NOT NULL REFERENCES public.service_pros(id) ON DELETE CASCADE,
  previous_booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  new_booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_rebook_events_customer ON public.rebook_events(customer_id);
CREATE INDEX IF NOT EXISTS idx_rebook_events_pro ON public.rebook_events(pro_id);

ALTER TABLE public.rebook_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Participants view rebook events" ON public.rebook_events;
CREATE POLICY "Participants view rebook events"
  ON public.rebook_events FOR SELECT TO authenticated
  USING (
    customer_id = auth.uid()
    OR pro_id IN (SELECT id FROM public.service_pros WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Customers insert rebook events" ON public.rebook_events;
CREATE POLICY "Customers insert rebook events"
  ON public.rebook_events FOR INSERT TO authenticated
  WITH CHECK (customer_id = auth.uid());

-- 4. JOB_COMPLETIONS: After photos + note (required before payment release)
CREATE TABLE IF NOT EXISTS public.job_completions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  pro_id UUID NOT NULL REFERENCES public.service_pros(id) ON DELETE CASCADE,
  after_photo_urls TEXT[] NOT NULL DEFAULT '{}',
  completion_note TEXT,
  completed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  share_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(booking_id)
);

CREATE INDEX IF NOT EXISTS idx_job_completions_booking ON public.job_completions(booking_id);
CREATE INDEX IF NOT EXISTS idx_job_completions_pro ON public.job_completions(pro_id);
CREATE INDEX IF NOT EXISTS idx_job_completions_completed ON public.job_completions(completed_at DESC);

ALTER TABLE public.job_completions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Participants view job completions" ON public.job_completions;
CREATE POLICY "Participants view job completions"
  ON public.job_completions FOR SELECT TO authenticated
  USING (
    booking_id IN (
      SELECT b.id FROM public.bookings b
      WHERE b.customer_id = auth.uid()
         OR b.pro_id IN (SELECT id FROM public.service_pros WHERE user_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "Pros insert job completions" ON public.job_completions;
CREATE POLICY "Pros insert job completions"
  ON public.job_completions FOR INSERT TO authenticated
  WITH CHECK (
    pro_id IN (SELECT id FROM public.service_pros WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Pros update job completions share count" ON public.job_completions;
CREATE POLICY "Pros update job completions share count"
  ON public.job_completions FOR UPDATE TO authenticated
  USING (pro_id IN (SELECT id FROM public.service_pros WHERE user_id = auth.uid()))
  WITH CHECK (true);

-- 5. ADMIN VIEW: Marketplace trust analytics
CREATE OR REPLACE VIEW public.admin_marketplace_trust_analytics AS
SELECT
  (SELECT COUNT(*) FROM public.job_arrivals WHERE location_verified = true) AS arrival_verified_count,
  (SELECT COUNT(*) FROM public.job_arrivals) AS arrival_total_count,
  (SELECT COALESCE(AVG(CASE WHEN ja.location_verified THEN 100.0 ELSE 0 END), 0)
   FROM public.job_arrivals ja) AS arrival_verification_rate,
  (SELECT COUNT(DISTINCT customer_id) FROM public.rebook_events) AS rebook_customer_count,
  (SELECT COUNT(*) FROM public.rebook_events) AS rebook_event_count,
  (SELECT COUNT(*) FROM public.job_completions) AS completion_proof_count,
  (SELECT COALESCE(SUM(share_count), 0) FROM public.job_completions) AS flyer_share_count,
  (SELECT COUNT(*) FROM public.job_completions WHERE completed_at > now() - interval '7 days') AS neighborhood_jobs_7d;
