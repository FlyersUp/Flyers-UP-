-- Pro earnings summary: net customer refunds against gross pro_earnings.amount (USD).
-- Refunds are tracked on bookings.refunded_total_cents (cents); cap at gross so fee-only refunds do not drive pro net negative.

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
    total_earnings := 0;
    this_month := 0;
    completed_jobs := 0;
    pending_payments := 0;
    RETURN NEXT;
    RETURN;
  END IF;

  month_start := date_trunc('month', now());

  SELECT COALESCE(SUM(
    GREATEST(
      0::numeric,
      e.amount - LEAST(
        COALESCE(b.refunded_total_cents, 0)::numeric / 100.0,
        e.amount
      )
    )
  ), 0) INTO total_earnings
  FROM public.pro_earnings e
  JOIN public.bookings b ON b.id = e.booking_id
  WHERE e.pro_id = pid;

  SELECT COALESCE(SUM(
    GREATEST(
      0::numeric,
      e.amount - LEAST(
        COALESCE(b.refunded_total_cents, 0)::numeric / 100.0,
        e.amount
      )
    )
  ), 0) INTO this_month
  FROM public.pro_earnings e
  JOIN public.bookings b ON b.id = e.booking_id
  WHERE e.pro_id = pid
    AND e.created_at >= month_start;

  SELECT COALESCE(COUNT(1), 0) INTO completed_jobs
  FROM public.bookings b
  WHERE b.pro_id = pid
    AND b.status = 'completed';

  SELECT COALESCE(SUM(b.price), 0) INTO pending_payments
  FROM public.bookings b
  WHERE b.pro_id = pid
    AND b.status IN ('requested', 'accepted', 'awaiting_payment')
    AND b.price IS NOT NULL;

  RETURN NEXT;
END;
$fn$;

REVOKE ALL ON FUNCTION public.get_my_pro_earnings_summary() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_my_pro_earnings_summary() TO authenticated;
