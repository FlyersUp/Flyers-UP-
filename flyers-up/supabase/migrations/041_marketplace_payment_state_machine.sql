-- ============================================
-- MARKETPLACE PAYMENT STATE MACHINE
-- ============================================
-- Adds deposit support, payment_due_at, new statuses, pro deposit config.
-- Safe to re-run (idempotent).
-- ============================================

-- 1. PRO_PROFILES: deposit config
ALTER TABLE public.pro_profiles
  ADD COLUMN IF NOT EXISTS deposit_percent_default INTEGER DEFAULT 50,
  ADD COLUMN IF NOT EXISTS deposit_percent_min INTEGER DEFAULT 20,
  ADD COLUMN IF NOT EXISTS deposit_percent_max INTEGER DEFAULT 80;

COMMENT ON COLUMN public.pro_profiles.deposit_percent_default IS 'Default deposit % (10-100)';
COMMENT ON COLUMN public.pro_profiles.deposit_percent_min IS 'Min deposit % (hard limit)';
COMMENT ON COLUMN public.pro_profiles.deposit_percent_max IS 'Max deposit % (hard limit)';

-- 2. BOOKINGS: new columns
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS payment_due_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS final_payment_intent_id TEXT,
  ADD COLUMN IF NOT EXISTS deposit_percent INTEGER,
  ADD COLUMN IF NOT EXISTS amount_deposit INTEGER,
  ADD COLUMN IF NOT EXISTS amount_remaining INTEGER,
  ADD COLUMN IF NOT EXISTS final_payment_status TEXT,
  ADD COLUMN IF NOT EXISTS fully_paid_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS payout_status TEXT DEFAULT 'pending';

COMMENT ON COLUMN public.bookings.payment_due_at IS 'When deposit must be paid (30 min from accept)';
COMMENT ON COLUMN public.bookings.final_payment_intent_id IS 'PI for remainder after job complete';
COMMENT ON COLUMN public.bookings.deposit_percent IS 'Deposit % used (10-100)';
COMMENT ON COLUMN public.bookings.amount_deposit IS 'Deposit amount in cents';
COMMENT ON COLUMN public.bookings.amount_remaining IS 'Remaining balance in cents';
COMMENT ON COLUMN public.bookings.final_payment_status IS 'Status of final payment';
COMMENT ON COLUMN public.bookings.fully_paid_at IS 'When remainder was paid';
COMMENT ON COLUMN public.bookings.payout_status IS 'Pro payout: pending|in_transit|paid|failed';

-- 3. Drop old status constraint and add new statuses
ALTER TABLE public.bookings DROP CONSTRAINT IF EXISTS bookings_status_check;

ALTER TABLE public.bookings
  ADD CONSTRAINT bookings_status_check
  CHECK (status IN (
    'requested', 'accepted', 'payment_required', 'deposit_paid', 'fully_paid',
    'pro_en_route', 'in_progress', 'completed_pending_payment', 'paid',
    'expired_unpaid', 'cancelled', 'declined'
  ));

-- 4. Index for cron (expire unpaid)
CREATE INDEX IF NOT EXISTS idx_bookings_payment_due_at
  ON public.bookings (payment_due_at)
  WHERE status IN ('payment_required', 'accepted') AND (payment_status IS NULL OR payment_status NOT IN ('PAID', 'succeeded'));
