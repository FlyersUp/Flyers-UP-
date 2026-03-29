-- ============================================
-- Native availability model: pro_user_id, JS weekday 0–6, text times, settings
-- Replaces 094 pro_id-based tables (data in those tables is dropped).
-- ============================================

DROP POLICY IF EXISTS "pro_availability_rules_own" ON public.pro_availability_rules;
DROP POLICY IF EXISTS "pro_blocked_times_own" ON public.pro_blocked_times;
DROP POLICY IF EXISTS "pro_availability_settings_own" ON public.pro_availability_settings;

DROP TABLE IF EXISTS public.pro_availability_rules CASCADE;
DROP TABLE IF EXISTS public.pro_blocked_times CASCADE;
DROP TABLE IF EXISTS public.pro_availability_settings CASCADE;

-- 1) Recurring rules (Sunday=0 .. Saturday=6 per JS getDay convention)
CREATE TABLE public.pro_availability_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pro_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
  start_time TEXT NOT NULL,
  end_time TEXT NOT NULL,
  is_available BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_pro_availability_rules_user_day ON public.pro_availability_rules(pro_user_id, day_of_week);

COMMENT ON TABLE public.pro_availability_rules IS
  'Weekly windows; day_of_week 0=Sun..6=Sat. Empty = fall back to service_pros.business_hours in app.';

-- 2) Blocked intervals (pro-only + admin; customers use computed APIs)
CREATE TABLE public.pro_blocked_times (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pro_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  start_at TIMESTAMPTZ NOT NULL,
  end_at TIMESTAMPTZ NOT NULL,
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (start_at < end_at)
);

CREATE INDEX idx_pro_blocked_times_user_range ON public.pro_blocked_times(pro_user_id, start_at, end_at);

-- 3) Settings (one row per pro user)
CREATE TABLE public.pro_availability_settings (
  pro_user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  timezone TEXT NOT NULL DEFAULT 'America/New_York',
  slot_interval_minutes INTEGER NOT NULL DEFAULT 30 CHECK (slot_interval_minutes >= 5 AND slot_interval_minutes <= 240),
  buffer_before_minutes INTEGER NOT NULL DEFAULT 0 CHECK (buffer_before_minutes >= 0),
  buffer_after_minutes INTEGER NOT NULL DEFAULT 0 CHECK (buffer_after_minutes >= 0),
  min_notice_minutes INTEGER NOT NULL DEFAULT 60 CHECK (min_notice_minutes >= 0),
  max_advance_days INTEGER NOT NULL DEFAULT 60 CHECK (max_advance_days >= 1 AND max_advance_days <= 365),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Bookings: scheduling bounds for overlap checks
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS scheduled_end_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS estimated_duration_minutes INTEGER;

COMMENT ON COLUMN public.bookings.scheduled_end_at IS 'UTC end instant; pair with scheduled_start_at for conflict detection.';
COMMENT ON COLUMN public.bookings.estimated_duration_minutes IS 'Service duration in minutes; used when scheduled_end_at is null.';

-- RLS
ALTER TABLE public.pro_availability_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pro_blocked_times ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pro_availability_settings ENABLE ROW LEVEL SECURITY;

-- Pros: full CRUD on own rows
CREATE POLICY "pro_availability_rules_self"
  ON public.pro_availability_rules FOR ALL TO authenticated
  USING (pro_user_id = auth.uid())
  WITH CHECK (pro_user_id = auth.uid());

CREATE POLICY "pro_availability_settings_self"
  ON public.pro_availability_settings FOR ALL TO authenticated
  USING (pro_user_id = auth.uid())
  WITH CHECK (pro_user_id = auth.uid());

-- Blocked times: pros manage own; customers have no SELECT; admins may read
CREATE POLICY "pro_blocked_times_self_all"
  ON public.pro_blocked_times FOR ALL TO authenticated
  USING (pro_user_id = auth.uid())
  WITH CHECK (pro_user_id = auth.uid());

CREATE POLICY "pro_blocked_times_admin_select"
  ON public.pro_blocked_times FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

-- Service-role overlap check (hard double-booking guard for accepted/active jobs)
CREATE OR REPLACE FUNCTION public.booking_has_schedule_conflict(
  p_pro_id uuid,
  p_start_utc timestamptz,
  p_end_utc timestamptz,
  p_exclude_booking_id uuid DEFAULT NULL
) RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.bookings b
    WHERE b.pro_id = p_pro_id
      AND (p_exclude_booking_id IS NULL OR b.id <> p_exclude_booking_id)
      AND b.status IN ('accepted', 'pro_en_route', 'on_the_way', 'in_progress')
      AND b.scheduled_start_at IS NOT NULL
      AND b.scheduled_end_at IS NOT NULL
      AND b.scheduled_start_at < p_end_utc
      AND b.scheduled_end_at > p_start_utc
  );
$$;

REVOKE ALL ON FUNCTION public.booking_has_schedule_conflict(uuid, timestamptz, timestamptz, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.booking_has_schedule_conflict(uuid, timestamptz, timestamptz, uuid) TO service_role;
