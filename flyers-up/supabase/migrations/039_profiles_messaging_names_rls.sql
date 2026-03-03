-- ============================================
-- Allow Pros and Customers to view profile names for messaging
-- ============================================
-- Pros need to see customer names in messages; customers need to see Pro names.
-- Existing RLS only allows viewing own profile. Add policies for messaging context.
-- Safe to re-run (idempotent).

-- Pros can view id, first_name, last_name, full_name, email of customers
-- they have a booking or conversation with
DROP POLICY IF EXISTS "Pros can view customer profiles for messaging" ON public.profiles;
CREATE POLICY "Pros can view customer profiles for messaging" ON public.profiles
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.bookings b
      JOIN public.service_pros sp ON sp.id = b.pro_id
      WHERE sp.user_id = auth.uid() AND b.customer_id = profiles.id
    )
    OR EXISTS (
      SELECT 1 FROM public.conversations c
      JOIN public.service_pros sp ON sp.id = c.pro_id
      WHERE sp.user_id = auth.uid() AND c.customer_id = profiles.id
    )
  );

-- Customers can view id, first_name, last_name, full_name of Pros (service_pros.user_id)
-- they have a booking or conversation with
DROP POLICY IF EXISTS "Customers can view pro profiles for messaging" ON public.profiles;
CREATE POLICY "Customers can view pro profiles for messaging" ON public.profiles
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.bookings b
      JOIN public.service_pros sp ON sp.user_id = profiles.id
      WHERE b.customer_id = auth.uid() AND b.pro_id = sp.id
    )
    OR EXISTS (
      SELECT 1 FROM public.conversations c
      JOIN public.service_pros sp ON sp.user_id = profiles.id
      WHERE c.customer_id = auth.uid() AND c.pro_id = sp.id
    )
  );
