-- MIGRATION: Job Progress Controls - add on_the_way, in_progress statuses and timestamp columns
--
-- Pro status flow: requested -> accepted -> on_the_way -> in_progress -> awaiting_payment -> completed
-- (completed is set by payment flow; pros advance through awaiting_payment via "Mark as complete")
--
-- Timestamp columns: accepted_at, on_the_way_at, started_at, completed_at, status_updated_at, status_updated_by

-- 1. Add on_the_way and in_progress to status constraint
ALTER TABLE public.bookings DROP CONSTRAINT IF EXISTS bookings_status_check;
ALTER TABLE public.bookings
  ADD CONSTRAINT bookings_status_check
  CHECK (status IN (
    'requested', 'accepted', 'on_the_way', 'in_progress',
    'awaiting_payment', 'completed', 'cancelled', 'declined'
  ));

-- 2. Add timestamp columns (only if they don't exist)
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS accepted_at timestamptz NULL;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS on_the_way_at timestamptz NULL;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS started_at timestamptz NULL;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS completed_at timestamptz NULL;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS status_updated_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS status_updated_by uuid NULL;

COMMENT ON COLUMN public.bookings.accepted_at IS 'When pro accepted the booking';
COMMENT ON COLUMN public.bookings.on_the_way_at IS 'When pro indicated they are on the way';
COMMENT ON COLUMN public.bookings.started_at IS 'When pro started the job (in progress)';
COMMENT ON COLUMN public.bookings.completed_at IS 'When pro marked work complete (transition to awaiting_payment)';
COMMENT ON COLUMN public.bookings.status_updated_at IS 'Last status change timestamp';
COMMENT ON COLUMN public.bookings.status_updated_by IS 'Pro user id who triggered last status change';
