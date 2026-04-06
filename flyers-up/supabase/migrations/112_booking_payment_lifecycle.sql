-- ============================================
-- BOOKING PAYMENT LIFECYCLE (marketplace-grade)
-- ============================================
-- Add parallel lifecycle columns, payment summary, event ledger, disputes.
-- Legacy columns (status, payment_status UNPAID/PAID, paid_deposit_at, etc.) remain source of truth for existing flows; new fields sync incrementally.
-- payment_lifecycle_status: lowercase lifecycle (spec called this payment_status; legacy payment_status stays uppercase deposit PI state).
-- ============================================

-- Legacy payment_status CHECK must allow PROCESSING (webhook updates).
ALTER TABLE public.bookings DROP CONSTRAINT IF EXISTS bookings_payment_status_check;
ALTER TABLE public.bookings
  ADD CONSTRAINT bookings_payment_status_check
  CHECK (
    payment_status IN (
      'UNPAID', 'REQUIRES_ACTION', 'PAID', 'REFUNDED', 'FAILED', 'PROCESSING'
    )
  );

ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS service_status text NOT NULL DEFAULT 'requested',
  ADD COLUMN IF NOT EXISTS payment_lifecycle_status text NOT NULL DEFAULT 'unpaid',
  ADD COLUMN IF NOT EXISTS dispute_status text NOT NULL DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS payout_hold_reason text NOT NULL DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS platform_fee_cents integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS final_amount_cents integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS tip_amount_cents integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS tax_amount_cents integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS stripe_customer_id text,
  ADD COLUMN IF NOT EXISTS saved_payment_method_id text,
  ADD COLUMN IF NOT EXISTS payment_method_brand text,
  ADD COLUMN IF NOT EXISTS payment_method_last4 text,
  ADD COLUMN IF NOT EXISTS off_session_ready boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS deposit_payment_intent_id text,
  ADD COLUMN IF NOT EXISTS payout_transfer_id text,
  ADD COLUMN IF NOT EXISTS refunded_at timestamptz,
  ADD COLUMN IF NOT EXISTS customer_review_deadline_at timestamptz,
  ADD COLUMN IF NOT EXISTS final_charge_attempted_at timestamptz,
  ADD COLUMN IF NOT EXISTS final_charge_retry_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS requires_customer_action_at timestamptz,
  ADD COLUMN IF NOT EXISTS payment_failed_at timestamptz,
  ADD COLUMN IF NOT EXISTS amount_refunded_cents integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS amount_paid_cents integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS payout_amount_cents integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS payout_blocked boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS issue_reported_at timestamptz,
  ADD COLUMN IF NOT EXISTS issue_summary text,
  ADD COLUMN IF NOT EXISTS admin_hold boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS admin_hold_reason text;

COMMENT ON COLUMN public.bookings.payment_lifecycle_status IS 'Marketplace payment lifecycle (lowercase). Legacy payment_status remains UNPAID/PAID for deposit PaymentIntent.';
COMMENT ON COLUMN public.bookings.service_status IS 'Service delivery lifecycle (parallel to status for payment/cron queries).';
COMMENT ON COLUMN public.bookings.payout_blocked IS 'When true, automatic payout release must not run; see payout_hold_reason.';

-- Mirror fee snapshot into platform_fee_cents / final_amount_cents where empty
UPDATE public.bookings b
SET
  platform_fee_cents = COALESCE(NULLIF(b.platform_fee_cents, 0), NULLIF(b.amount_platform_fee, 0), 0),
  final_amount_cents = COALESCE(NULLIF(b.final_amount_cents, 0), NULLIF(b.remaining_amount_cents, 0), 0),
  amount_refunded_cents = COALESCE(NULLIF(b.amount_refunded_cents, 0), NULLIF(b.refunded_total_cents, 0), 0)
WHERE b.platform_fee_cents = 0
   OR b.final_amount_cents = 0
   OR b.amount_refunded_cents = 0;

-- Legacy rows: unblock by default so existing payout cron behavior is preserved.
-- Migration 113_payout_blocked_reconcile.sql re-tightens holds for failed / action-needed finals.
UPDATE public.bookings SET payout_blocked = false;

-- Backfill payment_lifecycle_status from legacy money columns
UPDATE public.bookings b
SET payment_lifecycle_status = CASE
  WHEN b.payout_released = true THEN 'payout_sent'
  WHEN COALESCE(b.final_payment_status, '') ILIKE 'paid' AND b.payout_released = false THEN 'payout_ready'
  WHEN COALESCE(b.payment_status, '') ILIKE 'paid'
    AND (b.final_payment_status IS NULL OR b.final_payment_status = '' OR b.final_payment_status ILIKE 'unpaid')
    THEN 'deposit_paid'
  WHEN COALESCE(b.payment_status, '') ILIKE 'failed'
    OR COALESCE(b.final_payment_status, '') ILIKE 'failed'
    THEN 'payment_failed'
  ELSE b.payment_lifecycle_status
END;

UPDATE public.bookings SET dispute_status = 'issue_reported' WHERE dispute_open = true AND dispute_status = 'none';

UPDATE public.bookings SET payout_blocked = true, payout_hold_reason = 'dispute_open' WHERE dispute_open = true;

CREATE INDEX IF NOT EXISTS idx_bookings_payment_lifecycle_status ON public.bookings (payment_lifecycle_status);
CREATE INDEX IF NOT EXISTS idx_bookings_service_status_lifecycle ON public.bookings (service_status);
CREATE INDEX IF NOT EXISTS idx_bookings_dispute_status_lifecycle ON public.bookings (dispute_status);
CREATE INDEX IF NOT EXISTS idx_bookings_payout_blocked ON public.bookings (payout_blocked) WHERE payout_blocked = true;
CREATE INDEX IF NOT EXISTS idx_bookings_customer_review_deadline ON public.bookings (customer_review_deadline_at)
  WHERE customer_review_deadline_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_bookings_payout_released_at ON public.bookings (payout_released_at)
  WHERE payout_released_at IS NOT NULL;

-- ---------------------------------------------------------------------------
-- booking_payment_summary (one row per booking)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.booking_payment_summary (
  booking_id uuid PRIMARY KEY REFERENCES public.bookings(id) ON DELETE CASCADE,
  stripe_customer_id text,
  saved_payment_method_id text,
  payment_method_brand text,
  payment_method_last4 text,
  off_session_ready boolean NOT NULL DEFAULT false,
  currency text NOT NULL DEFAULT 'usd',
  subtotal_cents integer NOT NULL DEFAULT 0,
  platform_fee_cents integer NOT NULL DEFAULT 0,
  deposit_amount_cents integer NOT NULL DEFAULT 0,
  final_amount_cents integer NOT NULL DEFAULT 0,
  tip_amount_cents integer NOT NULL DEFAULT 0,
  tax_amount_cents integer NOT NULL DEFAULT 0,
  total_amount_cents integer NOT NULL DEFAULT 0,
  amount_paid_cents integer NOT NULL DEFAULT 0,
  amount_refunded_cents integer NOT NULL DEFAULT 0,
  payout_amount_cents integer NOT NULL DEFAULT 0,
  deposit_status text NOT NULL DEFAULT 'pending',
  final_status text NOT NULL DEFAULT 'not_due',
  overall_payment_status text NOT NULL DEFAULT 'unpaid',
  dispute_status text NOT NULL DEFAULT 'none',
  payout_blocked boolean NOT NULL DEFAULT true,
  payout_hold_reason text NOT NULL DEFAULT 'none',
  deposit_payment_intent_id text,
  final_payment_intent_id text,
  payout_transfer_id text,
  deposit_paid_at timestamptz,
  final_paid_at timestamptz,
  payout_eligible_at timestamptz,
  payout_released_at timestamptz,
  final_charge_retry_count integer NOT NULL DEFAULT 0,
  final_charge_attempted_at timestamptz,
  requires_customer_action_at timestamptz,
  payment_failed_at timestamptz,
  customer_review_deadline_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_booking_payment_summary_overall ON public.booking_payment_summary (overall_payment_status);

DROP TRIGGER IF EXISTS update_booking_payment_summary_updated_at ON public.booking_payment_summary;
CREATE TRIGGER update_booking_payment_summary_updated_at
  BEFORE UPDATE ON public.booking_payment_summary
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.booking_payment_summary ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Participants select booking_payment_summary" ON public.booking_payment_summary;
CREATE POLICY "Participants select booking_payment_summary"
  ON public.booking_payment_summary FOR SELECT TO authenticated
  USING (
    booking_id IN (
      SELECT b.id FROM public.bookings b
      WHERE b.customer_id = auth.uid()
         OR b.pro_id IN (SELECT id FROM public.service_pros WHERE user_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "Admins all booking_payment_summary" ON public.booking_payment_summary;
CREATE POLICY "Admins all booking_payment_summary"
  ON public.booking_payment_summary FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));

-- ---------------------------------------------------------------------------
-- booking_payment_events (append-only ledger; inserts via service role only)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.booking_payment_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  phase text NOT NULL,
  status text NOT NULL,
  amount_cents integer NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'usd',
  stripe_payment_intent_id text,
  stripe_charge_id text,
  stripe_transfer_id text,
  stripe_refund_id text,
  actor_type text NOT NULL DEFAULT 'system',
  actor_user_id uuid,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_booking_payment_events_booking ON public.booking_payment_events (booking_id);
CREATE INDEX IF NOT EXISTS idx_booking_payment_events_type ON public.booking_payment_events (event_type);
CREATE INDEX IF NOT EXISTS idx_booking_payment_events_created ON public.booking_payment_events (booking_id, created_at DESC);

ALTER TABLE public.booking_payment_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Participants select booking_payment_events" ON public.booking_payment_events;
CREATE POLICY "Participants select booking_payment_events"
  ON public.booking_payment_events FOR SELECT TO authenticated
  USING (
    booking_id IN (
      SELECT b.id FROM public.bookings b
      WHERE b.customer_id = auth.uid()
         OR b.pro_id IN (SELECT id FROM public.service_pros WHERE user_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "Admins select booking_payment_events" ON public.booking_payment_events;
CREATE POLICY "Admins select booking_payment_events"
  ON public.booking_payment_events FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));

-- ---------------------------------------------------------------------------
-- booking_disputes — extend existing table from migration 061 (do not recreate;
-- CREATE TABLE IF NOT EXISTS would be skipped and leave old schema without `status`).
-- ---------------------------------------------------------------------------
ALTER TABLE public.booking_disputes
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'issue_reported',
  ADD COLUMN IF NOT EXISTS resolution text,
  ADD COLUMN IF NOT EXISTS resolution_notes text,
  ADD COLUMN IF NOT EXISTS reported_by_user_id uuid,
  ADD COLUMN IF NOT EXISTS assigned_admin_user_id uuid,
  ADD COLUMN IF NOT EXISTS pro_response text,
  ADD COLUMN IF NOT EXISTS internal_notes text,
  ADD COLUMN IF NOT EXISTS refund_amount_cents integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS adjusted_final_amount_cents integer,
  ADD COLUMN IF NOT EXISTS adjusted_payout_amount_cents integer,
  ADD COLUMN IF NOT EXISTS opened_at timestamptz;

UPDATE public.booking_disputes d
SET opened_at = d.created_at
WHERE d.opened_at IS NULL AND d.created_at IS NOT NULL;

ALTER TABLE public.booking_disputes
  ALTER COLUMN opened_at SET DEFAULT now();

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.booking_disputes WHERE opened_at IS NULL) THEN
    ALTER TABLE public.booking_disputes ALTER COLUMN opened_at SET NOT NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_booking_disputes_status ON public.booking_disputes (status);
CREATE INDEX IF NOT EXISTS idx_booking_disputes_opened ON public.booking_disputes (opened_at DESC);

ALTER TABLE public.booking_disputes ENABLE ROW LEVEL SECURITY;

-- Align policy names with 061; single participant + admin set.
DROP POLICY IF EXISTS "Participants view own disputes" ON public.booking_disputes;
DROP POLICY IF EXISTS "Admins manage disputes" ON public.booking_disputes;
DROP POLICY IF EXISTS "Participants select booking_disputes" ON public.booking_disputes;
DROP POLICY IF EXISTS "Admins all booking_disputes" ON public.booking_disputes;

CREATE POLICY "Participants select booking_disputes"
  ON public.booking_disputes FOR SELECT TO authenticated
  USING (
    booking_id IN (
      SELECT b.id FROM public.bookings b
      WHERE b.customer_id = auth.uid()
         OR b.pro_id IN (SELECT id FROM public.service_pros WHERE user_id = auth.uid())
    )
  );

CREATE POLICY "Admins all booking_disputes"
  ON public.booking_disputes FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));
