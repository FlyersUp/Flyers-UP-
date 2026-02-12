-- ============================================
-- MIGRATION: Scale indexes + lightweight aggregates
-- ============================================
-- Goal: keep common read paths fast as data grows (100k+ users).
--
-- Notes:
-- - Use idempotent CREATE INDEX IF NOT EXISTS
-- - Prefer partial/composite indexes that match actual filters + sort
-- - Add a safe RPC to compute pro earnings summary without pulling all rows client-side
-- ============================================

-- ============================================
-- 1) SERVICE_PROS browsing indexes
-- ============================================
-- Fast "pros by category" listing: available=true + category filter + rating sort
CREATE INDEX IF NOT EXISTS idx_service_pros_category_available_rating
  ON public.service_pros (category_id, rating DESC)
  WHERE available = true;

-- Fast hoarding lane listing: accepts_hoarding_jobs=true + available=true + rating sort
-- (accepts_hoarding_jobs is added in earlier migration)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'service_pros'
      AND column_name = 'accepts_hoarding_jobs'
  ) THEN
    CREATE INDEX IF NOT EXISTS idx_service_pros_hoarding_available_rating
      ON public.service_pros (rating DESC)
      WHERE available = true AND accepts_hoarding_jobs = true;
  END IF;
END $$;

-- ============================================
-- 2) BOOKINGS indexes for user timelines
-- ============================================
-- Customer timeline: customer_id filter + service_date sort
CREATE INDEX IF NOT EXISTS idx_bookings_customer_service_date
  ON public.bookings (customer_id, service_date DESC);

-- Pro timeline: pro_id filter + service_date sort
CREATE INDEX IF NOT EXISTS idx_bookings_pro_service_date
  ON public.bookings (pro_id, service_date ASC);

-- Fast pending/completed filters per pro (used for dashboards/earnings)
CREATE INDEX IF NOT EXISTS idx_bookings_pro_status
  ON public.bookings (pro_id, status);

-- ============================================
-- 3) PRO_EARNINGS aggregation support
-- ============================================
CREATE INDEX IF NOT EXISTS idx_pro_earnings_pro_created_at
  ON public.pro_earnings (pro_id, created_at DESC);

-- ============================================
-- 4) Safe RPC: pro earnings summary (avoid pulling all rows)
-- ============================================
-- SECURITY DEFINER is used to allow fast aggregation without requiring the client
-- to fetch all earnings rows. Guardrails:
-- - Only returns data for the authenticated user (no args).
-- - Does not expose any other users' data.
CREATE OR REPLACE FUNCTION public.get_my_pro_earnings_summary()
RETURNS TABLE (
  total_earnings numeric,
  this_month numeric,
  completed_jobs integer,
  pending_payments numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  uid uuid;
  pid uuid;
  month_start timestamptz;
BEGIN
  uid := auth.uid();
  IF uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT sp.id INTO pid
  FROM public.service_pros sp
  WHERE sp.user_id = uid
  LIMIT 1;

  IF pid IS NULL THEN
    -- Not a pro yet; return zeros.
    total_earnings := 0;
    this_month := 0;
    completed_jobs := 0;
    pending_payments := 0;
    RETURN NEXT;
    RETURN;
  END IF;

  month_start := date_trunc('month', now());

  SELECT COALESCE(SUM(e.amount), 0) INTO total_earnings
  FROM public.pro_earnings e
  WHERE e.pro_id = pid;

  SELECT COALESCE(SUM(e.amount), 0) INTO this_month
  FROM public.pro_earnings e
  WHERE e.pro_id = pid
    AND e.created_at >= month_start;

  SELECT COALESCE(COUNT(1), 0) INTO completed_jobs
  FROM public.bookings b
  WHERE b.pro_id = pid
    AND b.status = 'completed';

  SELECT COALESCE(SUM(b.price), 0) INTO pending_payments
  FROM public.bookings b
  WHERE b.pro_id = pid
    AND b.status IN ('requested', 'accepted')
    AND b.price IS NOT NULL;

  RETURN NEXT;
END;
$fn$;

REVOKE ALL ON FUNCTION public.get_my_pro_earnings_summary() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_my_pro_earnings_summary() TO authenticated;

