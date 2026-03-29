-- Recurring holds in schedule conflict RPC, one booking per occurrence, customer count upsert, reminder idempotency

-- 1) Hard conflict check used at booking create: include approved-series recurring holds
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
  )
  OR EXISTS (
    SELECT 1
    FROM public.recurring_occurrences ro
    INNER JOIN public.recurring_series rs ON rs.id = ro.recurring_series_id
    INNER JOIN public.service_pros sp ON sp.user_id = ro.pro_user_id AND sp.id = p_pro_id
    WHERE rs.status = 'approved'
      AND ro.status IN ('scheduled', 'pending_confirmation', 'confirmed', 'reschedule_requested')
      AND ro.scheduled_start_at < p_end_utc
      AND ro.scheduled_end_at > p_start_utc
  );
$$;

-- 2) At most one booking row per recurring occurrence (idempotent generation)
CREATE UNIQUE INDEX IF NOT EXISTS idx_bookings_unique_recurring_occurrence
  ON public.bookings (recurring_occurrence_id)
  WHERE recurring_occurrence_id IS NOT NULL;

-- 3) Denormalized count: upsert preferences row if missing
CREATE OR REPLACE FUNCTION public.sync_recurring_preferences_customer_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  target uuid;
  cnt integer;
BEGIN
  target := COALESCE(NEW.pro_user_id, OLD.pro_user_id);
  IF target IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT COUNT(DISTINCT rs.customer_user_id)::integer
  INTO cnt
  FROM public.recurring_series rs
  WHERE rs.pro_user_id = target
    AND rs.status = 'approved';

  INSERT INTO public.recurring_preferences (pro_user_id, current_recurring_customers, updated_at)
  VALUES (target, cnt, now())
  ON CONFLICT (pro_user_id) DO UPDATE SET
    current_recurring_customers = EXCLUDED.current_recurring_customers,
    updated_at = now();

  RETURN NULL;
END;
$fn$;

-- 4) Idempotent recurring reminder sends (cron)
CREATE TABLE IF NOT EXISTS public.recurring_reminder_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recurring_occurrence_id UUID NOT NULL REFERENCES public.recurring_occurrences(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (recurring_occurrence_id, event_type)
);

CREATE INDEX IF NOT EXISTS idx_recurring_reminder_events_occurrence
  ON public.recurring_reminder_events(recurring_occurrence_id);

ALTER TABLE public.recurring_reminder_events ENABLE ROW LEVEL SECURITY;

-- No authenticated policies: service role / admin client only
COMMENT ON TABLE public.recurring_reminder_events IS 'Cron idempotency for recurring occurrence reminders';
