-- Automated payout release: admin review flag + expand payout_review_queue reasons.

ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS requires_admin_review BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN public.bookings.requires_admin_review IS 'True when cron or system flagged this booking for manual payout/dispute review (dispute, refund hold, missing proof, etc.)';

CREATE INDEX IF NOT EXISTS idx_bookings_requires_admin_review_payout
  ON public.bookings (requires_admin_review, payout_released)
  WHERE requires_admin_review = true AND payout_released = false;

-- Allow additional queue reasons for cron-flagged cases (idempotent upserts by booking_id).
ALTER TABLE public.payout_review_queue DROP CONSTRAINT IF EXISTS payout_review_queue_reason_check;

ALTER TABLE public.payout_review_queue
  ADD CONSTRAINT payout_review_queue_reason_check CHECK (reason IN (
    'suspicious_completion',
    'missing_evidence',
    'low_arrival_confidence',
    'repeated_disputes',
    'repeated_no_shows',
    'low_reliability',
    'dispute_open',
    'refund_pending',
    'payout_blocked',
    'stripe_not_ready',
    'pro_payout_hold'
  ));
