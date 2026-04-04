-- Settled Stripe economics: net after fees per BalanceTransaction (cents).
-- stripe_actual_fee_cents was added in 107; this adds aggregate net on the booking + per-PI ledger.

ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS stripe_net_cents integer;

COMMENT ON COLUMN public.bookings.stripe_net_cents IS 'Sum of BalanceTransaction.net (cents) for customer charges on this booking; settled platform-side net after Stripe fees.';

ALTER TABLE public.booking_payment_intent_stripe_fees
  ADD COLUMN IF NOT EXISTS stripe_net_cents integer;

COMMENT ON COLUMN public.booking_payment_intent_stripe_fees.stripe_net_cents IS 'BalanceTransaction.net for this PaymentIntent charge (cents).';
