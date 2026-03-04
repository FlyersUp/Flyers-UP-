-- ============================================
-- BOOKING MONEY / CRON / NOTIFICATIONS
-- ============================================
-- Adds booking money columns, booking_events, stripe_events, indexes.
-- Safe to re-run (idempotent). Uses ADD COLUMN IF NOT EXISTS.
-- ============================================

-- A) BOOKINGS: money + timer + refund/payout columns
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'usd',
  ADD COLUMN IF NOT EXISTS total_amount_cents INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS deposit_amount_cents INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS remaining_amount_cents INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS paid_deposit_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS paid_remaining_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS started_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS completed_by_pro_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS confirmed_by_customer_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS cancel_reason TEXT,
  ADD COLUMN IF NOT EXISTS refund_status TEXT DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS stripe_payment_intent_deposit_id TEXT,
  ADD COLUMN IF NOT EXISTS stripe_payment_intent_remaining_id TEXT,
  ADD COLUMN IF NOT EXISTS stripe_refund_deposit_id TEXT,
  ADD COLUMN IF NOT EXISTS stripe_refund_remaining_id TEXT,
  ADD COLUMN IF NOT EXISTS stripe_transfer_id TEXT,
  ADD COLUMN IF NOT EXISTS stripe_destination_account_id TEXT;

-- B) NOTIFICATIONS: ensure body column (existing may have it)
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS body TEXT;
-- read_at for spec compatibility (existing uses read boolean)
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS read_at TIMESTAMPTZ;

-- C) BOOKING_EVENTS
CREATE TABLE IF NOT EXISTS public.booking_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_booking_events_booking_created
  ON public.booking_events(booking_id, created_at DESC);

-- D) STRIPE_EVENTS (webhook idempotency)
CREATE TABLE IF NOT EXISTS public.stripe_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stripe_event_id TEXT NOT NULL UNIQUE,
  type TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_stripe_events_event_id
  ON public.stripe_events(stripe_event_id);

-- E) INDEXES
CREATE INDEX IF NOT EXISTS idx_bookings_status_money
  ON public.bookings(status);
CREATE INDEX IF NOT EXISTS idx_bookings_payment_due_money
  ON public.bookings(payment_due_at) WHERE payment_due_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_bookings_payout_status
  ON public.bookings(payout_status) WHERE payout_status IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_bookings_refund_status
  ON public.bookings(refund_status) WHERE refund_status IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_notifications_user_read_at
  ON public.notifications(user_id, read_at) WHERE read_at IS NULL;

-- F) Expand status constraint to include new statuses (drop + recreate)
ALTER TABLE public.bookings DROP CONSTRAINT IF EXISTS bookings_status_check;
ALTER TABLE public.bookings
  ADD CONSTRAINT bookings_status_check
  CHECK (status IN (
    'requested', 'accepted', 'payment_required', 'deposit_paid', 'fully_paid',
    'pending_pro_acceptance', 'awaiting_deposit_payment', 'on_the_way',
    'pro_en_route', 'in_progress', 'completed_pending_payment', 'awaiting_payment',
    'work_completed_by_pro', 'awaiting_customer_confirmation', 'completed', 'paid',
    'expired_unpaid', 'cancelled', 'declined',
    'cancelled_expired', 'cancelled_by_customer', 'cancelled_by_pro', 'cancelled_admin'
  ));
