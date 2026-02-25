-- Add stripe_customer_id to profiles for Stripe Customer + PaymentMethods
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS stripe_customer_id text NULL;
COMMENT ON COLUMN public.profiles.stripe_customer_id IS 'Stripe Customer ID for saved payment methods and checkout';

-- Add payment tracking fields to bookings
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS payment_status text NOT NULL DEFAULT 'UNPAID'
  CHECK (payment_status IN ('UNPAID', 'REQUIRES_ACTION', 'PAID', 'REFUNDED', 'FAILED'));
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS paid_at timestamptz NULL;
COMMENT ON COLUMN public.bookings.payment_status IS 'Payment state: UNPAID, REQUIRES_ACTION, PAID, REFUNDED, FAILED';
COMMENT ON COLUMN public.bookings.paid_at IS 'When payment succeeded';
