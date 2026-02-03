-- ============================================
-- MIGRATION: booking_messages RLS policies
-- ============================================
-- Ensure customers + assigned pros can read/write booking message threads.
-- Safe to re-run (idempotent).

ALTER TABLE public.booking_messages ENABLE ROW LEVEL SECURITY;

-- Customers + assigned pros can read messages for their bookings
DROP POLICY IF EXISTS "Participants can view booking messages" ON public.booking_messages;
CREATE POLICY "Participants can view booking messages"
  ON public.booking_messages
  FOR SELECT
  TO authenticated
  USING (
    booking_id IN (
      SELECT b.id
      FROM public.bookings b
      WHERE b.customer_id = auth.uid()
         OR b.pro_id IN (SELECT id FROM public.service_pros WHERE user_id = auth.uid())
    )
  );

-- Customers + assigned pros can send messages for their bookings
DROP POLICY IF EXISTS "Participants can insert booking messages" ON public.booking_messages;
CREATE POLICY "Participants can insert booking messages"
  ON public.booking_messages
  FOR INSERT
  TO authenticated
  WITH CHECK (
    sender_id = auth.uid()
    AND sender_role IN ('customer', 'pro')
    AND booking_id IN (
      SELECT b.id
      FROM public.bookings b
      WHERE b.customer_id = auth.uid()
         OR b.pro_id IN (SELECT id FROM public.service_pros WHERE user_id = auth.uid())
    )
  );

