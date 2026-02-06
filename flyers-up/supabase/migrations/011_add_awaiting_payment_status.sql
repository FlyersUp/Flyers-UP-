-- ============================================
-- MIGRATION: Add 'awaiting_payment' status (Model C)
-- ============================================
-- Adds an intermediate status so pros can mark work complete,
-- then customers pay, then booking becomes 'completed'.
--
-- Status flow:
-- requested -> accepted/declined
-- accepted -> awaiting_payment/cancelled
-- awaiting_payment -> completed/cancelled (system/customer)
--
-- NOTE: This requires dropping and recreating the status check constraint.
-- ============================================

ALTER TABLE public.bookings
  DROP CONSTRAINT IF EXISTS bookings_status_check;

ALTER TABLE public.bookings
  ADD CONSTRAINT bookings_status_check
  CHECK (status IN ('requested', 'accepted', 'awaiting_payment', 'completed', 'cancelled', 'declined'));

