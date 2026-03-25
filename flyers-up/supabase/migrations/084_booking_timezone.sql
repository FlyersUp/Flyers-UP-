-- ============================================
-- Booking wall-clock timezone (IANA)
-- ============================================
-- service_date + service_time are interpreted in this zone before converting to UTC
-- for calendar exports and instant comparisons. Default matches app canonical zone.
-- ============================================

ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS booking_timezone TEXT NOT NULL DEFAULT 'America/New_York';

COMMENT ON COLUMN public.bookings.booking_timezone IS
  'IANA timezone for interpreting service_date + service_time (e.g. America/New_York).';
