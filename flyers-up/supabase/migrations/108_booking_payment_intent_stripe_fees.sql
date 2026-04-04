-- Idempotent ledger: one row per PaymentIntent so webhook retries / dual events do not double-count Stripe fees.

CREATE TABLE IF NOT EXISTS public.booking_payment_intent_stripe_fees (
  payment_intent_id text PRIMARY KEY,
  booking_id uuid NOT NULL REFERENCES public.bookings (id) ON DELETE CASCADE,
  stripe_fee_cents integer NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_bpisf_booking_id ON public.booking_payment_intent_stripe_fees (booking_id);

ALTER TABLE public.booking_payment_intent_stripe_fees ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.booking_payment_intent_stripe_fees IS 'Stripe BalanceTransaction fee (cents) per succeeded PaymentIntent; used to populate bookings.stripe_actual_fee_cents.';
