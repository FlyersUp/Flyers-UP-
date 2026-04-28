-- Payout release cron support columns:
-- - final_charge_id: source charge for transfer.source_transaction
-- - payout_failure_reason: latest transfer attempt failure reason for ops visibility

ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS final_charge_id TEXT,
  ADD COLUMN IF NOT EXISTS payout_failure_reason TEXT;

COMMENT ON COLUMN public.bookings.final_charge_id IS
  'Final successful Stripe charge id (ch_*) used as transfer.source_transaction when available.';

COMMENT ON COLUMN public.bookings.payout_failure_reason IS
  'Last payout transfer failure reason set by cron/manual payout attempts.';
