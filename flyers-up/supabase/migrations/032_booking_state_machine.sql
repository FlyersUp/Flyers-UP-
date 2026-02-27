-- ============================================
-- MIGRATION: Booking State Machine (Marketplace-style)
-- ============================================
-- Status flow: requested -> accepted -> pro_en_route -> in_progress -> completed_pending_payment -> paid
-- Terminal: cancelled (declined migrated to cancelled)
--
-- Timestamps: accepted_at, en_route_at, started_at, completed_at, paid_at
-- Payment: PaymentIntent created on Pro Accept (manual capture), captured on Mark Complete
-- ============================================

-- 1. Add en_route_at (alias for on_the_way_at - we use pro_en_route status)
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS en_route_at timestamptz NULL;
COMMENT ON COLUMN public.bookings.en_route_at IS 'When pro indicated they are on the way';

-- Backfill en_route_at from on_the_way_at if exists
UPDATE public.bookings SET en_route_at = on_the_way_at WHERE on_the_way_at IS NOT NULL AND en_route_at IS NULL;

-- 2. Drop status constraint for migration
ALTER TABLE public.bookings DROP CONSTRAINT IF EXISTS bookings_status_check;

-- 3. Migrate existing data to new status names (before new constraint)
UPDATE public.bookings SET status = 'pro_en_route' WHERE status = 'on_the_way';
UPDATE public.bookings SET status = 'completed_pending_payment' WHERE status = 'awaiting_payment';
UPDATE public.bookings SET status = 'paid' WHERE status = 'completed' AND (payment_status = 'PAID' OR paid_at IS NOT NULL);
UPDATE public.bookings SET status = 'completed_pending_payment' WHERE status = 'completed' AND (payment_status IS NULL OR payment_status != 'PAID');
UPDATE public.bookings SET status = 'requested' WHERE status = 'pending';

-- 4. Add new status constraint (declined kept for pro-refused requests)
ALTER TABLE public.bookings
  ADD CONSTRAINT bookings_status_check
  CHECK (status IN (
    'requested', 'accepted', 'pro_en_route', 'in_progress',
    'completed_pending_payment', 'paid', 'cancelled', 'declined'
  ));

-- 5. Ensure paid_at column exists (from 031)
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS paid_at timestamptz NULL;

-- 6. Ensure payment_intent_id exists (from 002)
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS payment_intent_id TEXT NULL;

-- 7. Ensure bookings are never auto-deleted - remove any CASCADE that would delete bookings
-- (bookings table itself has no ON DELETE - it's the parent. Child tables like pro_earnings
-- reference bookings. We don't want to delete bookings. No schema change needed - just document.)
-- Add comment for future reference
COMMENT ON TABLE public.bookings IS 'Marketplace bookings. Never auto-delete. Status: requested->accepted->pro_en_route->in_progress->completed_pending_payment->paid. Terminal: cancelled, declined.';
