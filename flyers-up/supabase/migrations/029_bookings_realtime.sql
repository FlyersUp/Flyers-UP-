-- Ensure bookings table is in supabase_realtime publication for customer Track Booking page
-- Customers subscribe to booking changes to see pro progress updates in real time
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime' AND tablename = 'bookings'
    ) THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.bookings;
    END IF;
  END IF;
END $$;
