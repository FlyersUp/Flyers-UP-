-- ============================================
-- FLYERS UP DATABASE SCHEMA
-- ============================================
-- Copy and paste this entire file into the Supabase SQL Editor
-- and run it to set up your database.
--
-- This creates:
-- 1. Tables (profiles, service_categories, service_pros, bookings, pro_earnings)
-- 2. Row Level Security (RLS) policies
-- 3. Seed data for testing
-- ============================================

-- ============================================
-- 1. CREATE TABLES
-- ============================================

-- Profiles table: extends auth.users with role info
-- Every user (customer or pro) gets a profile row
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('customer', 'pro', 'admin')) DEFAULT 'customer',
  full_name TEXT,
  phone TEXT,
  language_preference TEXT DEFAULT 'en',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Service categories (cleaning, plumbing, etc.)
CREATE TABLE IF NOT EXISTS public.service_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT, -- Emoji or icon identifier
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Service professionals profile
-- Each pro user can have one service_pros row
CREATE TABLE IF NOT EXISTS public.service_pros (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL,
  bio TEXT,
  category_id UUID NOT NULL REFERENCES public.service_categories(id),
  starting_price NUMERIC NOT NULL DEFAULT 0,
  rating NUMERIC NOT NULL DEFAULT 0 CHECK (rating >= 0 AND rating <= 5),
  review_count INTEGER NOT NULL DEFAULT 0,
  location TEXT,
  available BOOLEAN NOT NULL DEFAULT true,
  service_radius INTEGER,
  business_hours TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Each user can only have one pro profile
  UNIQUE(user_id)
);

-- Bookings between customers and pros
CREATE TABLE IF NOT EXISTS public.bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  pro_id UUID NOT NULL REFERENCES public.service_pros(id) ON DELETE CASCADE,
  service_date DATE NOT NULL,
  service_time TEXT NOT NULL, -- e.g., "14:00"
  address TEXT NOT NULL,
  notes TEXT,
  -- Status flow: requested -> accepted/declined, accepted -> completed/cancelled
  -- 'declined' = pro refused the request (different from 'cancelled' which is after accepting)
  status TEXT NOT NULL CHECK (status IN ('requested', 'accepted', 'completed', 'cancelled', 'declined')) DEFAULT 'requested',
  price NUMERIC,
  -- Status history: timeline of status changes for customer visibility
  -- Format: [{ "status": "requested", "at": "2025-11-25T09:00:00Z" }, ...]
  status_history JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Pro earnings tracking
CREATE TABLE IF NOT EXISTS public.pro_earnings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pro_id UUID NOT NULL REFERENCES public.service_pros(id) ON DELETE CASCADE,
  booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- User notification settings
CREATE TABLE IF NOT EXISTS public.user_notification_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  new_booking BOOLEAN NOT NULL DEFAULT true,
  job_status_updates BOOLEAN NOT NULL DEFAULT true,
  messages BOOLEAN NOT NULL DEFAULT true,
  marketing_emails BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Pro payout accounts (for payment settings)
CREATE TABLE IF NOT EXISTS public.pro_payout_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  method TEXT NOT NULL CHECK (method IN ('bank_account', 'paypal', 'cashapp')),
  account_last4 TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_service_pros_category ON public.service_pros(category_id);
CREATE INDEX IF NOT EXISTS idx_service_pros_user ON public.service_pros(user_id);
CREATE INDEX IF NOT EXISTS idx_bookings_customer ON public.bookings(customer_id);
CREATE INDEX IF NOT EXISTS idx_bookings_pro ON public.bookings(pro_id);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON public.bookings(status);
CREATE INDEX IF NOT EXISTS idx_bookings_status_history ON public.bookings USING GIN (status_history);
CREATE INDEX IF NOT EXISTS idx_pro_earnings_pro ON public.pro_earnings(pro_id);
CREATE INDEX IF NOT EXISTS idx_notification_settings_user ON public.user_notification_settings(user_id);
CREATE INDEX IF NOT EXISTS idx_payout_accounts_user ON public.pro_payout_accounts(user_id);


-- ============================================
-- 2. ENABLE ROW LEVEL SECURITY
-- ============================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_pros ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pro_earnings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_notification_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pro_payout_accounts ENABLE ROW LEVEL SECURITY;


-- ============================================
-- 3. RLS POLICIES
-- ============================================

-- PROFILES POLICIES
-- Users can read their own profile
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

-- Users can update their own profile
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- Allow insert for authenticated users (for signup flow)
-- Note: We use service role key in the API to create profiles after signup
DROP POLICY IF EXISTS "Service role can insert profiles" ON public.profiles;
CREATE POLICY "Service role can insert profiles"
  ON public.profiles FOR INSERT
  WITH CHECK (true);


-- SERVICE CATEGORIES POLICIES
-- Anyone can read categories (public data)
DROP POLICY IF EXISTS "Anyone can view service categories" ON public.service_categories;
CREATE POLICY "Anyone can view service categories"
  ON public.service_categories FOR SELECT
  TO authenticated, anon
  USING (true);


-- SERVICE PROS POLICIES
-- Anyone can view service pros (for browsing)
DROP POLICY IF EXISTS "Anyone can view service pros" ON public.service_pros;
CREATE POLICY "Anyone can view service pros"
  ON public.service_pros FOR SELECT
  TO authenticated, anon
  USING (true);

-- Pros can insert their own pro profile
DROP POLICY IF EXISTS "Users can insert own pro profile" ON public.service_pros;
CREATE POLICY "Users can insert own pro profile"
  ON public.service_pros FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Pros can update their own pro profile
DROP POLICY IF EXISTS "Pros can update own profile" ON public.service_pros;
CREATE POLICY "Pros can update own profile"
  ON public.service_pros FOR UPDATE
  USING (auth.uid() = user_id);


-- BOOKINGS POLICIES
-- Customers can view their own bookings
DROP POLICY IF EXISTS "Customers can view own bookings" ON public.bookings;
CREATE POLICY "Customers can view own bookings"
  ON public.bookings FOR SELECT
  USING (auth.uid() = customer_id);

-- Pros can view bookings for their services
DROP POLICY IF EXISTS "Pros can view their bookings" ON public.bookings;
CREATE POLICY "Pros can view their bookings"
  ON public.bookings FOR SELECT
  USING (
    pro_id IN (
      SELECT id FROM public.service_pros WHERE user_id = auth.uid()
    )
  );

-- Customers can create bookings
DROP POLICY IF EXISTS "Customers can create bookings" ON public.bookings;
CREATE POLICY "Customers can create bookings"
  ON public.bookings FOR INSERT
  WITH CHECK (auth.uid() = customer_id);

-- Pros can update booking status (accept/decline/complete/cancel)
DROP POLICY IF EXISTS "Pros can update booking status" ON public.bookings;
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


-- PRO EARNINGS POLICIES
-- Pros can view their own earnings
DROP POLICY IF EXISTS "Pros can view own earnings" ON public.pro_earnings;
CREATE POLICY "Pros can view own earnings"
  ON public.pro_earnings FOR SELECT
  USING (
    pro_id IN (
      SELECT id FROM public.service_pros WHERE user_id = auth.uid()
    )
  );

-- Pros can insert their own earnings (when marking jobs complete)
DROP POLICY IF EXISTS "Pros can insert own earnings" ON public.pro_earnings;
CREATE POLICY "Pros can insert own earnings"
  ON public.pro_earnings FOR INSERT
  WITH CHECK (
    pro_id IN (
      SELECT id FROM public.service_pros WHERE user_id = auth.uid()
    )
  );

-- NOTIFICATION SETTINGS POLICIES
-- Users can view their own notification settings
DROP POLICY IF EXISTS "Users can view own notification settings" ON public.user_notification_settings;
CREATE POLICY "Users can view own notification settings"
  ON public.user_notification_settings FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own notification settings
DROP POLICY IF EXISTS "Users can insert own notification settings" ON public.user_notification_settings;
CREATE POLICY "Users can insert own notification settings"
  ON public.user_notification_settings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own notification settings
DROP POLICY IF EXISTS "Users can update own notification settings" ON public.user_notification_settings;
CREATE POLICY "Users can update own notification settings"
  ON public.user_notification_settings FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- PAYOUT ACCOUNTS POLICIES
-- Pros can view their own payout account
DROP POLICY IF EXISTS "Pros can view own payout account" ON public.pro_payout_accounts;
CREATE POLICY "Pros can view own payout account"
  ON public.pro_payout_accounts FOR SELECT
  USING (auth.uid() = user_id);

-- Pros can insert their own payout account
DROP POLICY IF EXISTS "Pros can insert own payout account" ON public.pro_payout_accounts;
CREATE POLICY "Pros can insert own payout account"
  ON public.pro_payout_accounts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Pros can update their own payout account
DROP POLICY IF EXISTS "Pros can update own payout account" ON public.pro_payout_accounts;
CREATE POLICY "Pros can update own payout account"
  ON public.pro_payout_accounts FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);


-- ============================================
-- 4. CREATE TRIGGERS FOR UPDATED_AT
-- ============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to notification_settings
DROP TRIGGER IF EXISTS update_user_notification_settings_updated_at ON public.user_notification_settings;
CREATE TRIGGER update_user_notification_settings_updated_at
  BEFORE UPDATE ON public.user_notification_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Apply trigger to payout_accounts
DROP TRIGGER IF EXISTS update_pro_payout_accounts_updated_at ON public.pro_payout_accounts;
CREATE TRIGGER update_pro_payout_accounts_updated_at
  BEFORE UPDATE ON public.pro_payout_accounts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 5. ENABLE REALTIME
-- ============================================
-- Enable Supabase Realtime for tables that need live updates.
-- This allows clients to subscribe to INSERT/UPDATE/DELETE events.

-- Add tables to the supabase_realtime publication
-- Note: This requires running as a superuser or using the Supabase Dashboard
-- Go to Database > Replication and enable these tables if this SQL doesn't work

-- Option 1: If supabase_realtime publication exists (Supabase hosted)
DO $$
BEGIN
  -- Add bookings table to realtime
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'bookings'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.bookings;
  END IF;
  
  -- Add pro_earnings table to realtime
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'pro_earnings'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.pro_earnings;
  END IF;
EXCEPTION
  WHEN undefined_object THEN
    -- Publication doesn't exist, create it (for local development)
    RAISE NOTICE 'supabase_realtime publication does not exist. Creating...';
END $$;

-- Alternative: Enable via Supabase Dashboard
-- Go to: Database > Replication > supabase_realtime
-- Enable "bookings" and "pro_earnings" tables


-- ============================================
-- 6. SEED DATA
-- ============================================

-- Insert service categories
INSERT INTO public.service_categories (slug, name, description, icon) VALUES
  ('cleaning', 'Cleaning', 'Home and office cleaning services', '🧹'),
  ('plumbing', 'Plumbing', 'Pipe repairs, installations, and emergencies', '🔧'),
  ('lawn-care', 'Lawn Care', 'Mowing, landscaping, and garden maintenance', '🌿'),
  ('handyman', 'Handyman', 'General repairs and home improvement tasks', '🔨'),
  ('photographer', 'Photographer', 'Professional photography services for events, portraits, and commercial', '📸'),
  ('hvac', 'HVAC', 'Heating, ventilation, and air conditioning installation and repair', '❄️'),
  ('roofing', 'Roofing', 'Roof installation, repair, and maintenance services', '🏠'),
  ('pest-control', 'Pest Control', 'Extermination and prevention of pests and insects', '🐛'),
  ('carpet-cleaning', 'Carpet Cleaning', 'Professional carpet and upholstery cleaning services', '🧽'),
  ('landscaping', 'Landscaping', 'Landscape design, installation, and maintenance', '🌳')
ON CONFLICT (slug) DO NOTHING;

-- Note: Demo service pros will be created when users sign up as pros
-- For initial testing, you can create them manually in the Supabase dashboard
-- or use the signup flow in the app.

-- ============================================
-- OPTIONAL: Create demo users and pros
-- ============================================
-- Uncomment the following if you want to seed demo data.
-- You'll need to create auth users first in the Supabase Auth dashboard,
-- then get their UUIDs to insert here.

/*
-- Example: After creating auth users, insert their profiles and pro data
-- Replace 'YOUR-USER-UUID-HERE' with actual UUIDs from auth.users

-- Demo customer profile
INSERT INTO public.profiles (id, role, full_name) VALUES
  ('YOUR-CUSTOMER-UUID', 'customer', 'Demo Customer');

-- Demo pro profile
INSERT INTO public.profiles (id, role, full_name) VALUES
  ('YOUR-PRO-UUID', 'pro', 'Maria Santos');

-- Demo service pro
INSERT INTO public.service_pros (
  user_id, display_name, bio, category_id, starting_price, rating, review_count, location
) VALUES (
  'YOUR-PRO-UUID',
  'Maria Santos',
  'Professional cleaner with 8 years of experience.',
  (SELECT id FROM public.service_categories WHERE slug = 'cleaning'),
  35,
  4.9,
  127,
  'Downtown Area'
);
*/

