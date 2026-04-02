-- bookings.platform_fee_cents → customer_fees_retained_cents
-- Semantics: all customer-facing Flyers Up fees on the booking (service fee % + convenience + protection + demand).
-- Pro intended share is amount_subtotal; customer total is total_amount_cents.

ALTER TABLE public.bookings
  RENAME COLUMN platform_fee_cents TO customer_fees_retained_cents;

COMMENT ON COLUMN public.bookings.customer_fees_retained_cents IS
  'All customer-facing Flyers Up fees retained on the booking (service fee % + convenience + protection + demand), cents. Pro service amount is amount_subtotal; customer total is total_amount_cents.';
