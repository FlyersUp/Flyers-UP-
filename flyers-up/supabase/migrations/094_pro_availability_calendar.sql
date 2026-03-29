-- ============================================
-- Pro availability calendar (source of truth in-app)
-- Recurring weekly rules, timed blocks, per-pro slot/buffer settings
-- ============================================

-- 1) Recurring weekly windows (Luxon weekday: 1=Mon .. 7=Sun)
CREATE TABLE IF NOT EXISTS public.pro_availability_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pro_id UUID NOT NULL REFERENCES public.service_pros(id) ON DELETE CASCADE,
  day_of_week SMALLINT NOT NULL CHECK (day_of_week >= 1 AND day_of_week <= 7),
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  is_available BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (start_time < end_time)
);

CREATE INDEX IF NOT EXISTS idx_pro_availability_rules_pro_day
  ON public.pro_availability_rules(pro_id, day_of_week);

COMMENT ON TABLE public.pro_availability_rules IS
  'Recurring weekly availability. Empty set = fall back to service_pros.business_hours JSON in app.';

-- 2) Blocked intervals (vacation, appointments, manual blackouts)
CREATE TABLE IF NOT EXISTS public.pro_blocked_times (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pro_id UUID NOT NULL REFERENCES public.service_pros(id) ON DELETE CASCADE,
  start_at TIMESTAMPTZ NOT NULL,
  end_at TIMESTAMPTZ NOT NULL,
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (start_at < end_at)
);

CREATE INDEX IF NOT EXISTS idx_pro_blocked_times_pro_range
  ON public.pro_blocked_times(pro_id, start_at, end_at);

COMMENT ON TABLE public.pro_blocked_times IS
  'Pro manual blocks; subtracted after recurring availability when computing bookable slots.';

-- 3) Optional per-pro tuning (buffers, slot grid, calendar IANA zone)
CREATE TABLE IF NOT EXISTS public.pro_availability_settings (
  pro_id UUID PRIMARY KEY REFERENCES public.service_pros(id) ON DELETE CASCADE,
  buffer_before_minutes INTEGER NOT NULL DEFAULT 0 CHECK (buffer_before_minutes >= 0),
  buffer_after_minutes INTEGER NOT NULL DEFAULT 0 CHECK (buffer_after_minutes >= 0),
  slot_interval_minutes INTEGER NOT NULL DEFAULT 30 CHECK (slot_interval_minutes >= 5 AND slot_interval_minutes <= 240),
  timezone TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON COLUMN public.pro_availability_settings.timezone IS
  'IANA zone for interpreting recurring rule wall times; null = use bookings default / pro profile fallback.';

-- RLS: pros manage own rows; no broad SELECT for other users (API uses service role)
ALTER TABLE public.pro_availability_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pro_blocked_times ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pro_availability_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "pro_availability_rules_own" ON public.pro_availability_rules;
CREATE POLICY "pro_availability_rules_own"
  ON public.pro_availability_rules FOR ALL TO authenticated
  USING (pro_id IN (SELECT id FROM public.service_pros WHERE user_id = auth.uid()))
  WITH CHECK (pro_id IN (SELECT id FROM public.service_pros WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "pro_blocked_times_own" ON public.pro_blocked_times;
CREATE POLICY "pro_blocked_times_own"
  ON public.pro_blocked_times FOR ALL TO authenticated
  USING (pro_id IN (SELECT id FROM public.service_pros WHERE user_id = auth.uid()))
  WITH CHECK (pro_id IN (SELECT id FROM public.service_pros WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "pro_availability_settings_own" ON public.pro_availability_settings;
CREATE POLICY "pro_availability_settings_own"
  ON public.pro_availability_settings FOR ALL TO authenticated
  USING (pro_id IN (SELECT id FROM public.service_pros WHERE user_id = auth.uid()))
  WITH CHECK (pro_id IN (SELECT id FROM public.service_pros WHERE user_id = auth.uid()));
