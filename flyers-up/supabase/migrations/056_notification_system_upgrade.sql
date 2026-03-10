-- ============================================
-- NOTIFICATION SYSTEM UPGRADE
-- Deduplication, routing, expiration, indexes
-- ============================================

-- 1. Deduplication columns
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS unique_key TEXT;
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS dedupe_window_seconds INTEGER DEFAULT 60;

-- 2. Routing
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS target_path TEXT;

-- 3. Expiration
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;

-- Unique index for deduplication (unique_key + user_id, only when unique_key is set)
CREATE UNIQUE INDEX IF NOT EXISTS idx_notifications_unique_key_user
  ON public.notifications(unique_key, user_id)
  WHERE unique_key IS NOT NULL AND unique_key != '';

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_notifications_user_created_desc
  ON public.notifications(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_notifications_user_unread
  ON public.notifications(user_id)
  WHERE read_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_notifications_unique_key
  ON public.notifications(unique_key)
  WHERE unique_key IS NOT NULL AND unique_key != '';

CREATE INDEX IF NOT EXISTS idx_notifications_expires_at
  ON public.notifications(expires_at)
  WHERE expires_at IS NOT NULL;

-- Backfill target_path from deep_link for existing rows
UPDATE public.notifications SET target_path = deep_link WHERE target_path IS NULL AND deep_link IS NOT NULL;

COMMENT ON COLUMN public.notifications.unique_key IS 'Dedupe key: event_type:entity_id:user_id. Prevents duplicates from webhook/cron retries.';
COMMENT ON COLUMN public.notifications.target_path IS 'Canonical path for navigation when notification is clicked.';
COMMENT ON COLUMN public.notifications.expires_at IS 'When to hide/archive. Null = never expires.';

-- Conversation presence for message push smart detection
CREATE TABLE IF NOT EXISTS public.conversation_presence (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, conversation_id)
);

CREATE INDEX IF NOT EXISTS idx_conversation_presence_updated ON public.conversation_presence(updated_at);

ALTER TABLE public.conversation_presence ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own presence" ON public.conversation_presence;
CREATE POLICY "Users manage own presence"
  ON public.conversation_presence FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
