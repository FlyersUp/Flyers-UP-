-- ============================================
-- Performance: core btree indexes for hot paths
-- ============================================
-- Idempotent. Safe for high-traffic marketplace reads (bookings, pros, messages).
--
-- Notes:
-- - bookings(status) is already indexed as idx_bookings_status_money (202503 migration).
-- - Composite indexes idx_bookings_customer_service_date / idx_bookings_pro_service_date exist;
--   we still ensure named single-column indexes for DBs bootstrapped from migrations only
--   (matches schema.sql idx_bookings_customer / idx_bookings_pro).
-- ============================================

-- Bookings
CREATE INDEX IF NOT EXISTS idx_bookings_customer ON public.bookings (customer_id);
CREATE INDEX IF NOT EXISTS idx_bookings_pro ON public.bookings (pro_id);
CREATE INDEX IF NOT EXISTS idx_bookings_created_at ON public.bookings (created_at DESC);

-- Service pros (auth + availability filters)
CREATE INDEX IF NOT EXISTS idx_service_pros_user ON public.service_pros (user_id);
CREATE INDEX IF NOT EXISTS idx_service_pros_available ON public.service_pros (available);

-- Profiles (role checks, admin queries)
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles (role);

-- Booking chat: thread + chronological fetch (table predates numbered migrations in some DBs)
DO $do$
BEGIN
  IF to_regclass('public.booking_messages') IS NOT NULL THEN
    EXECUTE $idx$
      CREATE INDEX IF NOT EXISTS idx_booking_messages_booking_created
      ON public.booking_messages (booking_id, created_at DESC)
    $idx$;
  END IF;
END
$do$;

-- Conversation chat: thread + chronological fetch + time-only scans
CREATE INDEX IF NOT EXISTS idx_conversation_messages_conversation_created
  ON public.conversation_messages (conversation_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_conversation_messages_created_at
  ON public.conversation_messages (created_at DESC);
