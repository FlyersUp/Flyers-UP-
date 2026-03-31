-- ============================================
-- PRO SELF-SERVE ACCOUNT CLOSURE
-- ============================================
-- Soft-close: retain financial/legal rows; hide from marketplace; block new work.
-- ============================================

-- 1) profiles: account lifecycle
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS account_status TEXT NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS closed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS closure_requested_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS closure_reason TEXT;

ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_account_status_check;
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_account_status_check
  CHECK (account_status IN ('active', 'closure_requested', 'closed'));

COMMENT ON COLUMN public.profiles.account_status IS 'active | closure_requested | closed — closed pros cannot operate on the platform';
COMMENT ON COLUMN public.profiles.closed_at IS 'When the pro account was fully closed (soft close)';
COMMENT ON COLUMN public.profiles.closure_requested_at IS 'First closure request timestamp (set if not already set on close)';
COMMENT ON COLUMN public.profiles.closure_reason IS 'Optional free-text reason from self-serve close flow';

CREATE INDEX IF NOT EXISTS idx_profiles_account_status ON public.profiles (account_status)
  WHERE account_status = 'closed';

-- 2) service_pros: closure marker (availability also forced false in app)
ALTER TABLE public.service_pros
  ADD COLUMN IF NOT EXISTS closed_at TIMESTAMPTZ;

COMMENT ON COLUMN public.service_pros.closed_at IS 'When this pro row was closed; paired with profiles.account_status = closed';

CREATE INDEX IF NOT EXISTS idx_service_pros_closed_at ON public.service_pros (closed_at)
  WHERE closed_at IS NOT NULL;

-- 3) Trigger: closed profile cannot have marketplace availability
CREATE OR REPLACE FUNCTION public.service_pros_enforce_closed_profile()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = NEW.user_id AND p.account_status = 'closed'
  ) THEN
    NEW.available := false;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_service_pros_enforce_closed_profile ON public.service_pros;
CREATE TRIGGER trg_service_pros_enforce_closed_profile
  BEFORE INSERT OR UPDATE ON public.service_pros
  FOR EACH ROW
  EXECUTE PROCEDURE public.service_pros_enforce_closed_profile();
