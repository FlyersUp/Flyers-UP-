-- ============================================
-- FINALIZE FEE, REMAINING PAYMENT, AUTO-CONFIRM
-- ============================================
-- platform_fee_bps, platform_fee_cents, refunded_total_cents, transferred_total_cents
-- remaining_due_at, auto_confirm_at
-- Statuses: awaiting_remaining_payment, awaiting_customer_confirmation
-- ============================================

-- 1) BOOKINGS: fee + remaining + auto-confirm columns
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS platform_fee_bps INTEGER NOT NULL DEFAULT 1500,
  ADD COLUMN IF NOT EXISTS platform_fee_cents INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS refunded_total_cents INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS transferred_total_cents INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS remaining_due_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS auto_confirm_at TIMESTAMPTZ;

COMMENT ON COLUMN public.bookings.platform_fee_bps IS 'Platform fee in basis points (1500 = 15%)';
COMMENT ON COLUMN public.bookings.platform_fee_cents IS 'Platform fee in cents, computed at pricing time';
COMMENT ON COLUMN public.bookings.refunded_total_cents IS 'Total cents refunded to customer';
COMMENT ON COLUMN public.bookings.transferred_total_cents IS 'Total cents transferred to pro';
COMMENT ON COLUMN public.bookings.remaining_due_at IS 'When remaining payment is due (24h after work completed)';
COMMENT ON COLUMN public.bookings.auto_confirm_at IS 'When to auto-confirm if customer has not confirmed (24h after work completed)';

-- 2) Expand status constraint
ALTER TABLE public.bookings DROP CONSTRAINT IF EXISTS bookings_status_check;
ALTER TABLE public.bookings
  ADD CONSTRAINT bookings_status_check
  CHECK (status IN (
    'requested', 'accepted', 'payment_required', 'deposit_paid', 'fully_paid',
    'pending_pro_acceptance', 'awaiting_deposit_payment', 'on_the_way',
    'pro_en_route', 'in_progress', 'completed_pending_payment', 'awaiting_payment',
    'work_completed_by_pro', 'awaiting_remaining_payment', 'awaiting_customer_confirmation',
    'completed', 'paid',
    'expired_unpaid', 'cancelled', 'declined',
    'cancelled_expired', 'cancelled_by_customer', 'cancelled_by_pro', 'cancelled_admin'
  ));

-- 3) Indexes for cron
CREATE INDEX IF NOT EXISTS idx_bookings_remaining_due_at
  ON public.bookings(remaining_due_at) WHERE remaining_due_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_bookings_auto_confirm_at
  ON public.bookings(auto_confirm_at) WHERE auto_confirm_at IS NOT NULL;
