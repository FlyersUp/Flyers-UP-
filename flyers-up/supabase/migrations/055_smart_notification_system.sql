-- ============================================
-- SMART NOTIFICATION SYSTEM
-- 3-layer: in-app, realtime, push (3-5 per booking max)
-- ============================================

-- A. Extend notifications table with new columns
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS actor_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS category TEXT;
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS priority TEXT NOT NULL DEFAULT 'important';
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS entity_type TEXT;
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS entity_id UUID;
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS conversation_id UUID;
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS message_id UUID;
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS payment_id TEXT;
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS payout_id TEXT;

-- Backfill category from type for existing rows
UPDATE public.notifications SET category = CASE
  WHEN type IN ('booking_request', 'booking_accepted', 'booking_status', 'booking_declined', 'booking_confirmed', 'booking_on_the_way', 'booking_started', 'booking_completed', 'booking_canceled') THEN 'booking'
  WHEN type IN ('message_received', 'message.received') THEN 'message'
  WHEN type IN ('payment_captured', 'payment_deposit_paid', 'payment_failed', 'payment_balance_due', 'payment_refunded') THEN 'payment'
  WHEN type IN ('payout_sent', 'payout_failed') THEN 'payout'
  ELSE 'account'
END WHERE category IS NULL;

-- Ensure body has default for new schema
ALTER TABLE public.notifications ALTER COLUMN body SET DEFAULT '';
ALTER TABLE public.notifications ALTER COLUMN title SET NOT NULL;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_notifications_booking_id ON public.notifications(booking_id) WHERE booking_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_notifications_entity ON public.notifications(entity_type, entity_id) WHERE entity_type IS NOT NULL;

-- B. user_notification_preferences
CREATE TABLE IF NOT EXISTS public.user_notification_preferences (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  booking_push BOOLEAN NOT NULL DEFAULT true,
  message_push BOOLEAN NOT NULL DEFAULT true,
  payment_push BOOLEAN NOT NULL DEFAULT true,
  payout_push BOOLEAN NOT NULL DEFAULT true,
  marketing_in_app BOOLEAN NOT NULL DEFAULT true,
  quiet_hours_enabled BOOLEAN NOT NULL DEFAULT false,
  quiet_hours_start TIME,
  quiet_hours_end TIME,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_user_notification_preferences_user ON public.user_notification_preferences(user_id);

ALTER TABLE public.user_notification_preferences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own notification preferences" ON public.user_notification_preferences;
CREATE POLICY "Users manage own notification preferences"
  ON public.user_notification_preferences FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- C. user_push_devices
CREATE TABLE IF NOT EXISTS public.user_push_devices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  onesignal_player_id TEXT,
  onesignal_subscription_id TEXT,
  external_user_id TEXT,
  platform TEXT,
  device_label TEXT,
  notifications_enabled BOOLEAN NOT NULL DEFAULT true,
  last_seen_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_user_push_devices_user ON public.user_push_devices(user_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_push_devices_player ON public.user_push_devices(onesignal_player_id) WHERE onesignal_player_id IS NOT NULL AND onesignal_player_id != '';

ALTER TABLE public.user_push_devices ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own push devices" ON public.user_push_devices;
CREATE POLICY "Users manage own push devices"
  ON public.user_push_devices FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- D. notification_events (internal event log)
CREATE TABLE IF NOT EXISTS public.notification_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL,
  actor_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  target_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  booking_id UUID REFERENCES public.bookings(id) ON DELETE SET NULL,
  entity_type TEXT,
  entity_id UUID,
  payload JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notification_events_type_created ON public.notification_events(event_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notification_events_target ON public.notification_events(target_user_id, created_at DESC) WHERE target_user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_notification_events_booking ON public.notification_events(booking_id) WHERE booking_id IS NOT NULL;

ALTER TABLE public.notification_events ENABLE ROW LEVEL SECURITY;

-- Only service role inserts (no policy for authenticated)
DROP POLICY IF EXISTS "Admins can view notification events" ON public.notification_events;
CREATE POLICY "Admins can view notification events"
  ON public.notification_events FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));

-- E. notification_dedup_log (short-window dedupe for push)
CREATE TABLE IF NOT EXISTS public.notification_dedup_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dedupe_key TEXT NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_notification_dedup_key ON public.notification_dedup_log(dedupe_key, user_id);
CREATE INDEX IF NOT EXISTS idx_notification_dedup_created ON public.notification_dedup_log(created_at);

-- Auto-cleanup old dedup entries (older than 24h) - run via cron or trigger
COMMENT ON TABLE public.notification_dedup_log IS 'Prevents duplicate push/in-app within 24h. Cleanup via cron.';

-- Realtime: ensure notifications in publication
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') AND
     NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'notifications') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
  END IF;
END $$;
