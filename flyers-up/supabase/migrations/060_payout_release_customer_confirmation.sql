-- ============================================
-- PAYOUT RELEASE: CUSTOMER CONFIRMATION GATE
-- ============================================
-- Payouts only when: customer_confirmed = true OR auto_confirm_at < now()
-- Plus: job_completions has >= 2 photos
-- ============================================

-- customer_confirmed: set when customer explicitly confirms completion
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS customer_confirmed BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN public.bookings.customer_confirmed IS 'Customer explicitly confirmed job completion; payout eligible when true';

-- payout_released: gate for release-payouts cron (true after Stripe transfer)
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS payout_released BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN public.bookings.payout_released IS 'True after Stripe transfer to Pro; release-payouts only processes when false';

-- payout_timestamp: when payout was released
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS payout_timestamp TIMESTAMPTZ;

COMMENT ON COLUMN public.bookings.payout_timestamp IS 'When payout was released to Pro';

CREATE INDEX IF NOT EXISTS idx_bookings_payout_released
  ON public.bookings(payout_released) WHERE payout_released = false;

-- Backfill: existing payouts already released (avoid re-processing)
UPDATE public.bookings
SET payout_released = true, payout_timestamp = now()
WHERE payout_status = 'succeeded' AND (payout_released = false OR payout_released IS NULL);

-- Legacy: completed bookings without auto_confirm_at get it from completed_at so payout can release
UPDATE public.bookings
SET auto_confirm_at = completed_at
WHERE status = 'completed'
  AND paid_remaining_at IS NOT NULL
  AND auto_confirm_at IS NULL
  AND customer_confirmed = false;
