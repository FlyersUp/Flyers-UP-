-- Idempotent per-Stripe-event receipt email handling (avoids duplicate sends on replay / ordering).
CREATE TABLE IF NOT EXISTS public.booking_receipt_email_claims (
  stripe_event_id TEXT PRIMARY KEY,
  booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  email_kind TEXT NOT NULL CHECK (email_kind IN ('deposit', 'final')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_booking_receipt_email_claims_booking
  ON public.booking_receipt_email_claims(booking_id, created_at DESC);

COMMENT ON TABLE public.booking_receipt_email_claims IS 'One row per Stripe webhook event that attempted a Flyers Up customer receipt email; prevents duplicate sends on retry.';

ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS customer_receipt_deposit_email_note TEXT,
  ADD COLUMN IF NOT EXISTS customer_receipt_final_email_note TEXT;

COMMENT ON COLUMN public.bookings.customer_receipt_deposit_email_note IS 'e.g. skipped_resend_not_configured, or provider error summary';
COMMENT ON COLUMN public.bookings.customer_receipt_final_email_note IS 'e.g. skipped_resend_not_configured, or provider error summary';

ALTER TABLE public.booking_receipt_email_claims ENABLE ROW LEVEL SECURITY;
