-- ============================================
-- USER PREFERENCE TABLES
-- ============================================
-- Creates user_booking_preferences, user_safety_preferences, user_app_preferences.
-- Safe to re-run (IF NOT EXISTS). Fixes 406 when no row exists (use maybeSingle in code).
-- ============================================

-- User booking preferences (favorites, filters, rebook)
CREATE TABLE IF NOT EXISTS public.user_booking_preferences (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  preferred_service_slugs TEXT[] NOT NULL DEFAULT '{}',
  favorite_pro_ids UUID[] NOT NULL DEFAULT '{}',
  price_min NUMERIC,
  price_max NUMERIC,
  time_window_start TEXT,
  time_window_end TEXT,
  rebook_last_pro BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- User safety preferences
CREATE TABLE IF NOT EXISTS public.user_safety_preferences (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  no_contact_service BOOLEAN NOT NULL DEFAULT false,
  pet_present BOOLEAN NOT NULL DEFAULT false,
  gender_preference TEXT NOT NULL DEFAULT 'no_preference' CHECK (gender_preference IN ('no_preference', 'male', 'female', 'other')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- User app preferences (dark mode, units, map view)
CREATE TABLE IF NOT EXISTS public.user_app_preferences (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  dark_mode BOOLEAN NOT NULL DEFAULT false,
  distance_units TEXT NOT NULL DEFAULT 'miles' CHECK (distance_units IN ('miles', 'km')),
  default_map_view TEXT NOT NULL DEFAULT 'map' CHECK (default_map_view IN ('map', 'list')),
  location_enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE public.user_booking_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_safety_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_app_preferences ENABLE ROW LEVEL SECURITY;

-- Users can only access their own rows
CREATE POLICY "Users can manage own booking prefs" ON public.user_booking_preferences
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can manage own safety prefs" ON public.user_safety_preferences
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can manage own app prefs" ON public.user_app_preferences
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
