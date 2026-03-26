-- Track Flyers Up customer receipt emails (idempotent with webhook replays).
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS customer_receipt_deposit_email_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS customer_receipt_final_email_at TIMESTAMPTZ;

COMMENT ON COLUMN public.bookings.customer_receipt_deposit_email_at IS 'When Flyers Up sent the deposit payment confirmation email to the customer.';
COMMENT ON COLUMN public.bookings.customer_receipt_final_email_at IS 'When Flyers Up sent the final unified receipt email to the customer.';
