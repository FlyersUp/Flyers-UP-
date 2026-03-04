-- ============================================
-- NOTIFICATIONS UNREAD BADGE
-- ============================================
-- Adds data column, ensures read_at index for unread count.
-- Unread = read_at IS NULL. Safe to re-run (idempotent).
-- ============================================

-- Add data jsonb for extensible payload (bookingId, threadId, etc.)
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS data JSONB;

-- Ensure index for unread count query: WHERE user_id = ? AND read_at IS NULL
CREATE INDEX IF NOT EXISTS idx_notifications_user_read_at
  ON public.notifications(user_id, read_at) WHERE read_at IS NULL;

-- Ensure index for list query: ORDER BY created_at DESC
CREATE INDEX IF NOT EXISTS idx_notifications_user_created
  ON public.notifications(user_id, created_at DESC);

COMMENT ON COLUMN public.notifications.data IS 'Extensible payload: { bookingId, threadId, etc }';
