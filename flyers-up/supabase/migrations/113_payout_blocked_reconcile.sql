-- ============================================
-- Reconcile payout_blocked after 112 blanket reset
-- ============================================
-- Migration 112 set all rows to payout_blocked = false so legacy payouts kept working.
-- This pass re-applies holds where final payment clearly failed or needs customer action,
-- so releasePayout hard-guards apply without relying only on Stripe idempotency.
-- ============================================

UPDATE public.bookings
SET
  payout_blocked = true,
  payout_hold_reason = CASE
    WHEN COALESCE(final_payment_status, '') ILIKE 'failed' THEN 'charge_failed'
    WHEN payment_lifecycle_status = 'payment_failed' THEN 'charge_failed'
    WHEN payment_lifecycle_status = 'requires_customer_action' THEN 'requires_customer_action'
    ELSE COALESCE(payout_hold_reason, 'none')
  END
WHERE payout_released = false
  AND COALESCE(dispute_open, false) = false
  AND (
    COALESCE(final_payment_status, '') ILIKE 'failed'
    OR payment_lifecycle_status IN ('payment_failed', 'requires_customer_action')
  );
