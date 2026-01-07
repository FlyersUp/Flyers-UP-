-- Add payment_intent_id column to bookings table for Stripe integration
ALTER TABLE public.bookings 
ADD COLUMN IF NOT EXISTS payment_intent_id TEXT;

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_bookings_payment_intent_id 
ON public.bookings(payment_intent_id);

-- Add comment
COMMENT ON COLUMN public.bookings.payment_intent_id IS 'Stripe Payment Intent ID for tracking payments';



