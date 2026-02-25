-- Add cancelled_at timestamp and pending status (alias for requested in spec)
-- Keeps requested for backward compatibility; pending added per spec.

ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS cancelled_at timestamptz NULL;
COMMENT ON COLUMN public.bookings.cancelled_at IS 'When booking was cancelled';

ALTER TABLE public.bookings DROP CONSTRAINT IF EXISTS bookings_status_check;
ALTER TABLE public.bookings
  ADD CONSTRAINT bookings_status_check
  CHECK (status IN (
    'requested', 'pending', 'accepted', 'on_the_way', 'in_progress',
    'awaiting_payment', 'completed', 'cancelled', 'declined'
  ));
