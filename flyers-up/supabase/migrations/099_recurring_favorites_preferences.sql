-- ============================================
-- Favorites, preferred clients, mutual preference, recurring series
-- ============================================

-- A) Customer -> Pro favorites
CREATE TABLE IF NOT EXISTS public.customer_pro_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  pro_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  is_favorited BOOLEAN NOT NULL DEFAULT true,
  first_favorited_at TIMESTAMPTZ,
  last_interaction_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (customer_user_id, pro_user_id)
);

CREATE INDEX IF NOT EXISTS idx_customer_pro_preferences_customer ON public.customer_pro_preferences(customer_user_id);
CREATE INDEX IF NOT EXISTS idx_customer_pro_preferences_pro ON public.customer_pro_preferences(pro_user_id);

-- B) Pro -> customer preference
CREATE TABLE IF NOT EXISTS public.pro_customer_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pro_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  customer_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  preference_status TEXT NOT NULL DEFAULT 'standard' CHECK (
    preference_status IN ('standard', 'preferred', 'recurring_blocked')
  ),
  notes TEXT,
  marked_preferred_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (pro_user_id, customer_user_id)
);

CREATE INDEX IF NOT EXISTS idx_pro_customer_preferences_pro ON public.pro_customer_preferences(pro_user_id);
CREATE INDEX IF NOT EXISTS idx_pro_customer_preferences_customer ON public.pro_customer_preferences(customer_user_id);

-- C) Pro recurring settings (one row per pro user)
CREATE TABLE IF NOT EXISTS public.recurring_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pro_user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  recurring_enabled BOOLEAN NOT NULL DEFAULT true,
  max_recurring_customers INTEGER NOT NULL DEFAULT 5 CHECK (max_recurring_customers >= 0 AND max_recurring_customers <= 100),
  current_recurring_customers INTEGER NOT NULL DEFAULT 0 CHECK (current_recurring_customers >= 0),
  only_preferred_clients_can_request BOOLEAN NOT NULL DEFAULT false,
  require_mutual_preference_for_auto_approval BOOLEAN NOT NULL DEFAULT true,
  manual_approval_required BOOLEAN NOT NULL DEFAULT true,
  allow_auto_approval_for_mutual_preference BOOLEAN NOT NULL DEFAULT false,
  recurring_only_windows_enabled BOOLEAN NOT NULL DEFAULT false,
  timezone TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- D) Allowed occupations for recurring (slug = service_categories.slug or occupation key)
CREATE TABLE IF NOT EXISTS public.recurring_occupations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pro_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  occupation_slug TEXT NOT NULL,
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (pro_user_id, occupation_slug)
);

CREATE INDEX IF NOT EXISTS idx_recurring_occupations_pro ON public.recurring_occupations(pro_user_id);
CREATE INDEX IF NOT EXISTS idx_recurring_occupations_slug ON public.recurring_occupations(occupation_slug);

-- E) Recurring-only weekly windows (minute-of-day 0..1439)
CREATE TABLE IF NOT EXISTS public.recurring_availability_windows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pro_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
  start_minute INTEGER NOT NULL CHECK (start_minute >= 0 AND start_minute <= 1439),
  end_minute INTEGER NOT NULL CHECK (end_minute >= 1 AND end_minute <= 1440 AND end_minute > start_minute),
  occupation_slug TEXT,
  recurring_only BOOLEAN NOT NULL DEFAULT true,
  is_flexible BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_recurring_avail_windows_pro_day ON public.recurring_availability_windows(pro_user_id, day_of_week);

-- F) Recurring series (agreement)
CREATE TABLE IF NOT EXISTS public.recurring_series (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  pro_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  occupation_slug TEXT NOT NULL,
  frequency TEXT NOT NULL CHECK (frequency IN ('weekly', 'biweekly', 'monthly', 'custom')),
  interval_count INTEGER NOT NULL DEFAULT 1 CHECK (interval_count >= 1 AND interval_count <= 52),
  days_of_week JSONB NOT NULL DEFAULT '[]'::jsonb,
  start_date DATE NOT NULL,
  end_date DATE,
  preferred_start_time TIME NOT NULL,
  duration_minutes INTEGER NOT NULL CHECK (duration_minutes > 0 AND duration_minutes <= 24 * 60),
  timezone TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (
    status IN (
      'pending',
      'approved',
      'declined',
      'countered',
      'paused',
      'canceled',
      'completed'
    )
  ),
  requested_by_user_id UUID NOT NULL REFERENCES auth.users(id),
  auto_approved BOOLEAN NOT NULL DEFAULT false,
  recurring_slot_locked BOOLEAN NOT NULL DEFAULT true,
  is_flexible BOOLEAN NOT NULL DEFAULT false,
  customer_note TEXT,
  pro_note TEXT,
  cancellation_reason TEXT,
  pause_reason TEXT,
  counter_proposal JSONB,
  approved_at TIMESTAMPTZ,
  declined_at TIMESTAMPTZ,
  paused_at TIMESTAMPTZ,
  canceled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_recurring_series_customer ON public.recurring_series(customer_user_id);
CREATE INDEX IF NOT EXISTS idx_recurring_series_pro ON public.recurring_series(pro_user_id);
CREATE INDEX IF NOT EXISTS idx_recurring_series_status ON public.recurring_series(status);
CREATE INDEX IF NOT EXISTS idx_recurring_series_occupation ON public.recurring_series(occupation_slug);

-- G) Bookings link columns (before occurrences FK to bookings)
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS recurring_series_id UUID REFERENCES public.recurring_series(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS recurring_occurrence_id UUID,
  ADD COLUMN IF NOT EXISTS is_recurring BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_bookings_recurring_series ON public.bookings(recurring_series_id);
CREATE INDEX IF NOT EXISTS idx_bookings_recurring_occurrence ON public.bookings(recurring_occurrence_id);

-- H) Materialized occurrences
CREATE TABLE IF NOT EXISTS public.recurring_occurrences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recurring_series_id UUID NOT NULL REFERENCES public.recurring_series(id) ON DELETE CASCADE,
  customer_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  pro_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  scheduled_start_at TIMESTAMPTZ NOT NULL,
  scheduled_end_at TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (
    status IN (
      'scheduled',
      'pending_confirmation',
      'confirmed',
      'completed',
      'skipped',
      'reschedule_requested',
      'canceled'
    )
  ),
  booking_id UUID REFERENCES public.bookings(id) ON DELETE SET NULL,
  skip_reason TEXT,
  cancel_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (recurring_series_id, scheduled_start_at)
);

CREATE INDEX IF NOT EXISTS idx_recurring_occurrences_series ON public.recurring_occurrences(recurring_series_id);
CREATE INDEX IF NOT EXISTS idx_recurring_occurrences_pro_start ON public.recurring_occurrences(pro_user_id, scheduled_start_at);
CREATE INDEX IF NOT EXISTS idx_recurring_occurrences_customer_start ON public.recurring_occurrences(customer_user_id, scheduled_start_at);
CREATE INDEX IF NOT EXISTS idx_recurring_occurrences_status ON public.recurring_occurrences(status);

ALTER TABLE public.bookings
  DROP CONSTRAINT IF EXISTS bookings_recurring_occurrence_id_fkey;

ALTER TABLE public.bookings
  ADD CONSTRAINT bookings_recurring_occurrence_id_fkey
  FOREIGN KEY (recurring_occurrence_id)
  REFERENCES public.recurring_occurrences(id)
  ON DELETE SET NULL;

-- updated_at triggers
DROP TRIGGER IF EXISTS customer_pro_preferences_updated_at ON public.customer_pro_preferences;
CREATE TRIGGER customer_pro_preferences_updated_at
  BEFORE UPDATE ON public.customer_pro_preferences
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS pro_customer_preferences_updated_at ON public.pro_customer_preferences;
CREATE TRIGGER pro_customer_preferences_updated_at
  BEFORE UPDATE ON public.pro_customer_preferences
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS recurring_preferences_updated_at ON public.recurring_preferences;
CREATE TRIGGER recurring_preferences_updated_at
  BEFORE UPDATE ON public.recurring_preferences
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS recurring_occupations_updated_at ON public.recurring_occupations;
CREATE TRIGGER recurring_occupations_updated_at
  BEFORE UPDATE ON public.recurring_occupations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS recurring_availability_windows_updated_at ON public.recurring_availability_windows;
CREATE TRIGGER recurring_availability_windows_updated_at
  BEFORE UPDATE ON public.recurring_availability_windows
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS recurring_series_updated_at ON public.recurring_series;
CREATE TRIGGER recurring_series_updated_at
  BEFORE UPDATE ON public.recurring_series
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS recurring_occurrences_updated_at ON public.recurring_occurrences;
CREATE TRIGGER recurring_occurrences_updated_at
  BEFORE UPDATE ON public.recurring_occurrences
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Keep denormalized recurring customer count in sync (approved non-paused uses status approved only; paused is separate status)
CREATE OR REPLACE FUNCTION public.sync_recurring_preferences_customer_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  target uuid;
BEGIN
  target := COALESCE(NEW.pro_user_id, OLD.pro_user_id);
  IF target IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  UPDATE public.recurring_preferences rp
  SET current_recurring_customers = sub.cnt
  FROM (
    SELECT COUNT(DISTINCT rs.customer_user_id)::integer AS cnt
    FROM public.recurring_series rs
    WHERE rs.pro_user_id = target
      AND rs.status = 'approved'
  ) sub
  WHERE rp.pro_user_id = target;

  RETURN NULL;
END;
$fn$;

DROP TRIGGER IF EXISTS recurring_series_sync_count_ins ON public.recurring_series;
CREATE TRIGGER recurring_series_sync_count_ins
  AFTER INSERT ON public.recurring_series
  FOR EACH ROW EXECUTE FUNCTION public.sync_recurring_preferences_customer_count();

DROP TRIGGER IF EXISTS recurring_series_sync_count_upd ON public.recurring_series;
CREATE TRIGGER recurring_series_sync_count_upd
  AFTER UPDATE OF status, pro_user_id, customer_user_id ON public.recurring_series
  FOR EACH ROW EXECUTE FUNCTION public.sync_recurring_preferences_customer_count();

DROP TRIGGER IF EXISTS recurring_series_sync_count_del ON public.recurring_series;
CREATE TRIGGER recurring_series_sync_count_del
  AFTER DELETE ON public.recurring_series
  FOR EACH ROW EXECUTE FUNCTION public.sync_recurring_preferences_customer_count();

-- Ensure recurring_preferences row exists when pro registers series (lazy insert from app); trigger only updates existing row

-- RLS
ALTER TABLE public.customer_pro_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pro_customer_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recurring_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recurring_occupations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recurring_availability_windows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recurring_series ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recurring_occurrences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS customer_pro_preferences_own ON public.customer_pro_preferences;
CREATE POLICY customer_pro_preferences_own
  ON public.customer_pro_preferences FOR ALL TO authenticated
  USING (customer_user_id = (SELECT auth.uid()))
  WITH CHECK (customer_user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS pro_customer_preferences_own ON public.pro_customer_preferences;
CREATE POLICY pro_customer_preferences_own
  ON public.pro_customer_preferences FOR ALL TO authenticated
  USING (pro_user_id = (SELECT auth.uid()))
  WITH CHECK (pro_user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS recurring_preferences_own ON public.recurring_preferences;
CREATE POLICY recurring_preferences_own
  ON public.recurring_preferences FOR ALL TO authenticated
  USING (pro_user_id = (SELECT auth.uid()))
  WITH CHECK (pro_user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS recurring_occupations_own ON public.recurring_occupations;
CREATE POLICY recurring_occupations_own
  ON public.recurring_occupations FOR ALL TO authenticated
  USING (pro_user_id = (SELECT auth.uid()))
  WITH CHECK (pro_user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS recurring_availability_windows_own ON public.recurring_availability_windows;
CREATE POLICY recurring_availability_windows_own
  ON public.recurring_availability_windows FOR ALL TO authenticated
  USING (pro_user_id = (SELECT auth.uid()))
  WITH CHECK (pro_user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS recurring_series_participant_select ON public.recurring_series;
CREATE POLICY recurring_series_participant_select
  ON public.recurring_series FOR SELECT TO authenticated
  USING (
    customer_user_id = (SELECT auth.uid())
    OR pro_user_id = (SELECT auth.uid())
  );

DROP POLICY IF EXISTS recurring_series_customer_insert ON public.recurring_series;
CREATE POLICY recurring_series_customer_insert
  ON public.recurring_series FOR INSERT TO authenticated
  WITH CHECK (
    customer_user_id = (SELECT auth.uid())
    AND requested_by_user_id = (SELECT auth.uid())
  );

DROP POLICY IF EXISTS recurring_series_pro_update ON public.recurring_series;
CREATE POLICY recurring_series_pro_update
  ON public.recurring_series FOR UPDATE TO authenticated
  USING (pro_user_id = (SELECT auth.uid()))
  WITH CHECK (pro_user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS recurring_series_customer_update ON public.recurring_series;
CREATE POLICY recurring_series_customer_update
  ON public.recurring_series FOR UPDATE TO authenticated
  USING (customer_user_id = (SELECT auth.uid()))
  WITH CHECK (customer_user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS recurring_occurrences_participant_select ON public.recurring_occurrences;
CREATE POLICY recurring_occurrences_participant_select
  ON public.recurring_occurrences FOR SELECT TO authenticated
  USING (
    customer_user_id = (SELECT auth.uid())
    OR pro_user_id = (SELECT auth.uid())
  );

COMMENT ON TABLE public.customer_pro_preferences IS 'Customer favorites and relationship metadata';
COMMENT ON TABLE public.recurring_series IS 'Recurring schedule agreement; occurrences materialized after pro approval';
COMMENT ON TABLE public.recurring_occurrences IS 'Calendar instances; mutations primarily via service role APIs';

-- Backfill from legacy favorite_pros (service_pros.user_id)
INSERT INTO public.customer_pro_preferences (
  customer_user_id,
  pro_user_id,
  is_favorited,
  first_favorited_at,
  last_interaction_at
)
SELECT fp.customer_id, sp.user_id, true, fp.created_at, fp.created_at
FROM public.favorite_pros fp
INNER JOIN public.service_pros sp ON sp.id = fp.pro_id
WHERE sp.user_id IS NOT NULL
ON CONFLICT (customer_user_id, pro_user_id) DO NOTHING;
