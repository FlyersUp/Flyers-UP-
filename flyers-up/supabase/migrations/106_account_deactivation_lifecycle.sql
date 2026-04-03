-- ============================================
-- ACCOUNT DEACTIVATION LIFECYCLE (Facebook-style)
-- ============================================
-- States: active | deactivated | deleted
-- Replaces legacy closure_requested / closed (backfilled to deactivated).
-- ============================================

-- 1) New profile columns (PII scrub + scheduling for permanent deletion job)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS deactivated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS scheduled_deletion_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS deletion_reason TEXT,
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

COMMENT ON COLUMN public.profiles.deactivated_at IS 'When user initiated deactivation';
COMMENT ON COLUMN public.profiles.scheduled_deletion_at IS 'After this time, cron may permanently anonymize (deleted)';
COMMENT ON COLUMN public.profiles.deletion_reason IS 'Optional user-provided reason at deactivation';
COMMENT ON COLUMN public.profiles.deleted_at IS 'When permanent anonymization completed';

-- 2) Remember pro availability for reactivation
ALTER TABLE public.service_pros
  ADD COLUMN IF NOT EXISTS available_before_deactivation BOOLEAN;

COMMENT ON COLUMN public.service_pros.available_before_deactivation IS 'Snapshot of available before deactivate; restored on reactivate if safe';

-- 3) Drop old CHECK, migrate legacy statuses, add new CHECK
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_account_status_check;

UPDATE public.profiles
SET
  deactivated_at = COALESCE(deactivated_at, closed_at, now()),
  scheduled_deletion_at = COALESCE(
    scheduled_deletion_at,
    CASE
      WHEN account_status IN ('closed', 'closure_requested') THEN COALESCE(closed_at, now()) + interval '30 days'
      ELSE NULL
    END
  ),
  account_status = 'deactivated'
WHERE account_status IN ('closed', 'closure_requested');

-- Reactivation-friendly: clear legacy service_pros.closed_at when profile is deactivated (availability is enforced by trigger)
UPDATE public.service_pros sp
SET closed_at = NULL
FROM public.profiles p
WHERE sp.user_id = p.id AND p.account_status = 'deactivated';

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_account_status_check
  CHECK (account_status IN ('active', 'deactivated', 'deleted'));

COMMENT ON COLUMN public.profiles.account_status IS 'active | deactivated | deleted';

-- 4) Indexes for cron and filters
DROP INDEX IF EXISTS idx_profiles_account_status;
CREATE INDEX IF NOT EXISTS idx_profiles_account_status ON public.profiles (account_status);

CREATE INDEX IF NOT EXISTS idx_profiles_scheduled_deletion_at
  ON public.profiles (scheduled_deletion_at)
  WHERE scheduled_deletion_at IS NOT NULL;

-- 5) Trigger: deactivated/deleted profiles cannot stay “available” in marketplace
CREATE OR REPLACE FUNCTION public.service_pros_enforce_inactive_profile()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = NEW.user_id AND p.account_status IN ('deactivated', 'deleted')
  ) THEN
    NEW.available := false;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_service_pros_enforce_closed_profile ON public.service_pros;
-- Idempotent re-run: first run creates this name; without DROP, 42710 "already exists"
DROP TRIGGER IF EXISTS trg_service_pros_enforce_inactive_profile ON public.service_pros;
CREATE TRIGGER trg_service_pros_enforce_inactive_profile
  BEFORE INSERT OR UPDATE ON public.service_pros
  FOR EACH ROW
  EXECUTE PROCEDURE public.service_pros_enforce_inactive_profile();

-- 6) Optional audit trail (server-only writes via service role in app)
CREATE TABLE IF NOT EXISTS public.account_lifecycle_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN ('deactivated', 'reactivated', 'deletion_scheduled', 'permanently_deleted')),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_account_lifecycle_events_user ON public.account_lifecycle_events(user_id, created_at DESC);

ALTER TABLE public.account_lifecycle_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "account_lifecycle_events service role" ON public.account_lifecycle_events;
CREATE POLICY "account_lifecycle_events service role"
  ON public.account_lifecycle_events FOR ALL TO service_role
  USING (true) WITH CHECK (true);

COMMENT ON TABLE public.account_lifecycle_events IS 'Append-only style audit for account deactivation/reactivation/deletion; write only from server with service role';
