-- Add booking_messages to realtime publication for new-message alerts in the nav
-- Users receive INSERT events for messages in their bookings (RLS applies).
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime' AND tablename = 'booking_messages'
    ) THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.booking_messages;
    END IF;
  END IF;
END $$;
