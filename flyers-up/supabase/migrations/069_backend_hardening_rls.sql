-- ============================================
-- BACKEND HARDENING: RLS + Trust Safety
-- ============================================
-- 1. pro_earnings: Remove user INSERT - only service role creates earnings
-- 2. job_completions: Remove user INSERT - only API (complete route) creates
-- 3. job_arrivals: Remove user INSERT - only API (arrive route) creates
-- 4. profiles: Prevent role escalation via UPDATE
-- 5. booking_events: Enable RLS, no user INSERT (server-only)
-- ============================================

-- 1. PRO_EARNINGS: Earnings must only be created by server (webhook, cron).
--    Remove INSERT for authenticated - service role bypasses RLS.
DROP POLICY IF EXISTS "Pros can insert own earnings" ON public.pro_earnings;
-- No replacement: only service role can insert.

-- 2. JOB_COMPLETIONS: Completions must only be created by complete API (2+ photos).
--    Remove INSERT for authenticated - API uses admin client.
DROP POLICY IF EXISTS "Pros insert job completions" ON public.job_completions;
-- No replacement: only service role can insert.

-- 3. JOB_ARRIVALS: Arrivals must only be created by arrive API (GPS validation).
--    Remove INSERT for authenticated - API uses admin client.
DROP POLICY IF EXISTS "Pros insert job arrivals" ON public.job_arrivals;
-- No replacement: only service role can insert.

-- 4. PROFILES: Prevent role escalation via client UPDATE.
--    Allow: NULL -> role (onboarding), or same role. Block: customer<->pro, any->admin.
--    Service role (admin API) can change roles; client cannot.
CREATE OR REPLACE FUNCTION public.profiles_prevent_role_escalation()
RETURNS TRIGGER AS $$
DECLARE
  jwt_role text;
BEGIN
  -- Service role (admin API, cron) can change any role
  jwt_role := COALESCE(current_setting('request.jwt.claims', true)::json->>'role', '');
  IF jwt_role = 'service_role' THEN
    RETURN NEW;
  END IF;

  -- Allow if role unchanged
  IF NEW.role IS NOT DISTINCT FROM OLD.role THEN
    RETURN NEW;
  END IF;
  -- Allow if setting role for first time (onboarding: null -> customer|pro)
  IF OLD.role IS NULL AND NEW.role IN ('customer', 'pro') THEN
    RETURN NEW;
  END IF;
  -- Block: cannot change from customer to pro, pro to customer, or set admin
  RAISE EXCEPTION 'Role change not allowed. Use onboarding or contact support.';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS profiles_prevent_role_escalation_trigger ON public.profiles;
CREATE TRIGGER profiles_prevent_role_escalation_trigger
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.profiles_prevent_role_escalation();

-- 5. BOOKING_EVENTS: Ensure only server creates events.
--    Enable RLS if not already; add SELECT for participants; no INSERT for users.
ALTER TABLE public.booking_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Participants insert booking events" ON public.booking_events;
DROP POLICY IF EXISTS "Participants view booking events" ON public.booking_events;
CREATE POLICY "Participants view booking events"
  ON public.booking_events FOR SELECT TO authenticated
  USING (
    booking_id IN (
      SELECT b.id FROM public.bookings b
      WHERE b.customer_id = auth.uid()
         OR b.pro_id IN (SELECT id FROM public.service_pros WHERE user_id = auth.uid())
    )
  );
-- No INSERT policy: only service role (API routes) can insert.
