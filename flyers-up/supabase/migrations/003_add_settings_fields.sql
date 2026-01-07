-- ============================================
-- SETTINGS MODULE: Database Schema Updates
-- ============================================
-- Adds fields and tables needed for the Settings module
-- Run this migration after the base schema is set up

-- ============================================
-- 1. ADD COLUMNS TO EXISTING TABLES
-- ============================================

-- Add phone and language_preference to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS phone TEXT,
  ADD COLUMN IF NOT EXISTS language_preference TEXT DEFAULT 'en';

-- Add optional fields to service_pros for business settings
ALTER TABLE public.service_pros
  ADD COLUMN IF NOT EXISTS service_radius INTEGER, -- in miles/km
  ADD COLUMN IF NOT EXISTS business_hours TEXT; -- JSON or text description

-- ============================================
-- 2. CREATE NEW TABLES
-- ============================================

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
  account_last4 TEXT, -- Last 4 digits/identifier
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id) -- One payout method per pro
);

-- ============================================
-- 3. CREATE INDEXES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_notification_settings_user ON public.user_notification_settings(user_id);
CREATE INDEX IF NOT EXISTS idx_payout_accounts_user ON public.pro_payout_accounts(user_id);

-- ============================================
-- 4. ENABLE ROW LEVEL SECURITY
-- ============================================

ALTER TABLE public.user_notification_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pro_payout_accounts ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 5. RLS POLICIES
-- ============================================

-- NOTIFICATION SETTINGS POLICIES
-- Users can view their own notification settings
CREATE POLICY "Users can view own notification settings"
  ON public.user_notification_settings FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own notification settings
CREATE POLICY "Users can insert own notification settings"
  ON public.user_notification_settings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own notification settings
CREATE POLICY "Users can update own notification settings"
  ON public.user_notification_settings FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- PAYOUT ACCOUNTS POLICIES
-- Pros can view their own payout account
CREATE POLICY "Pros can view own payout account"
  ON public.pro_payout_accounts FOR SELECT
  USING (auth.uid() = user_id);

-- Pros can insert their own payout account
CREATE POLICY "Pros can insert own payout account"
  ON public.pro_payout_accounts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Pros can update their own payout account
CREATE POLICY "Pros can update own payout account"
  ON public.pro_payout_accounts FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ============================================
-- 6. CREATE TRIGGERS FOR UPDATED_AT
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
CREATE TRIGGER update_user_notification_settings_updated_at
  BEFORE UPDATE ON public.user_notification_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Apply trigger to payout_accounts
CREATE TRIGGER update_pro_payout_accounts_updated_at
  BEFORE UPDATE ON public.pro_payout_accounts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

