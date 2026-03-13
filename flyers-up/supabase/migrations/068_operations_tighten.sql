-- ============================================
-- OPERATIONS: Additional tighten-up fields
-- ============================================
-- en_route_at on bookings (if not already present from job flow)
-- Add mark_fraud to admin_decision if needed for future
-- ============================================

-- Ensure en_route_at exists (032 adds it; this is idempotent)
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS en_route_at TIMESTAMPTZ;
COMMENT ON COLUMN public.bookings.en_route_at IS 'When pro indicated they are on the way';
