-- Stuck payout detection + admin recovery fields for cron safety.

ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS payout_processing_started_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS payout_stuck_detected_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS payout_needs_admin_review BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN public.bookings.payout_processing_started_at IS
  'Timestamp when payout cron moved booking into payout_processing.';

COMMENT ON COLUMN public.bookings.payout_stuck_detected_at IS
  'Timestamp when cron marked payout as stuck (processing > threshold).';

COMMENT ON COLUMN public.bookings.payout_needs_admin_review IS
  'True when payout requires explicit admin review/recovery (e.g. stuck processing).';

CREATE INDEX IF NOT EXISTS idx_bookings_payout_processing_started
  ON public.bookings (payout_processing_started_at)
  WHERE payout_status = 'payout_processing' AND stripe_transfer_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_bookings_payout_needs_admin_review
  ON public.bookings (payout_needs_admin_review)
  WHERE payout_needs_admin_review = true;
