-- ============================================
-- MIGRATION: Add 'declined' status and earnings insert policy
-- ============================================
-- Run this migration if you already have the base schema deployed.
-- This adds:
-- 1. 'declined' to booking status options
-- 2. RLS policy for pros to insert their own earnings
--
-- If setting up from scratch, update the main schema.sql instead.
-- ============================================

-- ============================================
-- 1. UPDATE BOOKINGS STATUS CHECK CONSTRAINT
-- ============================================
-- Add 'declined' as a valid status (pro refuses a booking request)
-- This requires dropping and recreating the constraint

-- First, drop the existing constraint
ALTER TABLE public.bookings 
  DROP CONSTRAINT IF EXISTS bookings_status_check;

-- Add the new constraint with 'declined' included
ALTER TABLE public.bookings 
  ADD CONSTRAINT bookings_status_check 
  CHECK (status IN ('requested', 'accepted', 'completed', 'cancelled', 'declined'));


-- ============================================
-- 2. ADD RLS POLICY FOR PRO EARNINGS INSERT
-- ============================================
-- Pros can insert earnings for their own pro_id
-- This is needed when booking is marked 'completed' and earnings are created

-- Drop if exists (for idempotency)
DROP POLICY IF EXISTS "Pros can insert own earnings" ON public.pro_earnings;

-- Create the policy
CREATE POLICY "Pros can insert own earnings"
  ON public.pro_earnings FOR INSERT
  WITH CHECK (
    pro_id IN (
      SELECT id FROM public.service_pros WHERE user_id = auth.uid()
    )
  );


-- ============================================
-- 3. ADD RLS POLICY FOR BOOKING UPDATE CHECK
-- ============================================
-- Ensure the WITH CHECK clause is also set for update operations
-- This prevents a pro from changing pro_id to another pro's id

-- The existing UPDATE policy only has USING clause
-- Let's add a WITH CHECK clause for safety

-- Drop existing policy (we'll recreate it with both clauses)
DROP POLICY IF EXISTS "Pros can update booking status" ON public.bookings;

-- Recreate with both USING and WITH CHECK
CREATE POLICY "Pros can update booking status"
  ON public.bookings FOR UPDATE
  USING (
    -- Pro can only see/update bookings assigned to them
    pro_id IN (
      SELECT id FROM public.service_pros WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    -- Pro cannot reassign booking to a different pro
    pro_id IN (
      SELECT id FROM public.service_pros WHERE user_id = auth.uid()
    )
  );


-- ============================================
-- 4. OPTIONAL: Add index for declined status queries
-- ============================================
-- If you query declined bookings frequently

-- Index already exists on status column from base schema
-- This is just a note that declined will use that same index


-- ============================================
-- VERIFICATION
-- ============================================
-- After running, verify with:
-- SELECT conname, pg_get_constraintdef(oid) FROM pg_constraint WHERE conrelid = 'public.bookings'::regclass;
-- SELECT * FROM pg_policies WHERE tablename = 'pro_earnings';
-- SELECT * FROM pg_policies WHERE tablename = 'bookings';





