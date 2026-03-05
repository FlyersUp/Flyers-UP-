-- ============================================
-- JOB REQUESTS & OFFERS: Demand Board feature
-- ============================================
-- job_requests: customer job requests (expire after 24h)
-- job_offers: pro offers on requests
-- ============================================

-- 1. JOB_REQUESTS
CREATE TABLE IF NOT EXISTS public.job_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  service_category TEXT NOT NULL,
  budget_min NUMERIC,
  budget_max NUMERIC,
  location TEXT NOT NULL,
  photos JSONB NOT NULL DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'completed', 'expired', 'cancelled')),
  preferred_date DATE,
  preferred_time TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '24 hours')
);

CREATE INDEX IF NOT EXISTS idx_job_requests_customer ON public.job_requests(customer_id);
CREATE INDEX IF NOT EXISTS idx_job_requests_status ON public.job_requests(status);
CREATE INDEX IF NOT EXISTS idx_job_requests_expires ON public.job_requests(expires_at);
CREATE INDEX IF NOT EXISTS idx_job_requests_created ON public.job_requests(created_at DESC);

ALTER TABLE public.job_requests ENABLE ROW LEVEL SECURITY;

-- Customers: insert own, select own
DROP POLICY IF EXISTS "Customers insert own job requests" ON public.job_requests;
CREATE POLICY "Customers insert own job requests"
  ON public.job_requests FOR INSERT TO authenticated
  WITH CHECK (customer_id = auth.uid());

DROP POLICY IF EXISTS "Customers select own job requests" ON public.job_requests;
CREATE POLICY "Customers select own job requests"
  ON public.job_requests FOR SELECT TO authenticated
  USING (customer_id = auth.uid());

DROP POLICY IF EXISTS "Customers update own job requests" ON public.job_requests;
CREATE POLICY "Customers update own job requests"
  ON public.job_requests FOR UPDATE TO authenticated
  USING (customer_id = auth.uid())
  WITH CHECK (customer_id = auth.uid());

-- Pros: select open requests (for demand board)
DROP POLICY IF EXISTS "Pros select open job requests" ON public.job_requests;
CREATE POLICY "Pros select open job requests"
  ON public.job_requests FOR SELECT TO authenticated
  USING (
    status = 'open'
    AND expires_at > now()
    AND EXISTS (SELECT 1 FROM public.service_pros sp WHERE sp.user_id = auth.uid())
  );

-- 2. JOB_OFFERS
CREATE TABLE IF NOT EXISTS public.job_offers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL REFERENCES public.job_requests(id) ON DELETE CASCADE,
  pro_id UUID NOT NULL REFERENCES public.service_pros(id) ON DELETE CASCADE,
  price NUMERIC NOT NULL,
  message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(request_id, pro_id)
);

CREATE INDEX IF NOT EXISTS idx_job_offers_request ON public.job_offers(request_id);
CREATE INDEX IF NOT EXISTS idx_job_offers_pro ON public.job_offers(pro_id);

ALTER TABLE public.job_offers ENABLE ROW LEVEL SECURITY;

-- Pros: insert own offers, select own offers
DROP POLICY IF EXISTS "Pros insert own job offers" ON public.job_offers;
CREATE POLICY "Pros insert own job offers"
  ON public.job_offers FOR INSERT TO authenticated
  WITH CHECK (
    pro_id IN (SELECT id FROM public.service_pros WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Pros select own job offers" ON public.job_offers;
CREATE POLICY "Pros select own job offers"
  ON public.job_offers FOR SELECT TO authenticated
  USING (pro_id IN (SELECT id FROM public.service_pros WHERE user_id = auth.uid()));

-- Customers: select offers on their requests
DROP POLICY IF EXISTS "Customers select offers on own requests" ON public.job_offers;
CREATE POLICY "Customers select offers on own requests"
  ON public.job_offers FOR SELECT TO authenticated
  USING (
    request_id IN (SELECT id FROM public.job_requests WHERE customer_id = auth.uid())
  );

-- Realtime: Add tables to publication (run manually if migration fails)
-- ALTER PUBLICATION supabase_realtime ADD TABLE public.job_requests;
-- ALTER PUBLICATION supabase_realtime ADD TABLE public.job_offers;
