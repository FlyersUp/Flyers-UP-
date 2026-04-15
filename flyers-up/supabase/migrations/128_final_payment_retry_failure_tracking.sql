-- Final payment failure: Stripe decline mapping, last error snapshot, cron retry rules (see payment-lifecycle-service + final-charge-retries cron).

ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS final_payment_retry_reason text,
  ADD COLUMN IF NOT EXISTS last_failure_code text,
  ADD COLUMN IF NOT EXISTS last_failure_message text;

COMMENT ON COLUMN public.bookings.final_payment_retry_reason IS 'Last final-payment failure class: insufficient_funds | card_declined | requires_action | unknown. NULL = legacy row before this migration.';
COMMENT ON COLUMN public.bookings.last_failure_code IS 'Stripe last_payment_error.code (or synthetic) for the most recent final payment failure.';
COMMENT ON COLUMN public.bookings.last_failure_message IS 'Stripe last_payment_error.message or status text for the most recent final payment failure.';

ALTER TABLE public.bookings DROP CONSTRAINT IF EXISTS bookings_final_payment_retry_reason_check;

ALTER TABLE public.bookings
  ADD CONSTRAINT bookings_final_payment_retry_reason_check
  CHECK (
    final_payment_retry_reason IS NULL
    OR final_payment_retry_reason IN (
      'insufficient_funds',
      'card_declined',
      'requires_action',
      'unknown'
    )
  );
