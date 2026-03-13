-- ============================================
-- ALLOW ROLE SWITCH: Customer <-> Pro
-- ============================================
-- Users can switch between customer and pro. Data is preserved (profiles + service_pros).
-- Only admin (service_role) can set role to 'admin'.
-- ============================================

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

  -- Allow customer <-> pro (switch roles; data preserved in profiles + service_pros)
  IF OLD.role IN ('customer', 'pro') AND NEW.role IN ('customer', 'pro') THEN
    RETURN NEW;
  END IF;

  -- Block: only admin can set role to 'admin'
  RAISE EXCEPTION 'Role change not allowed. Only admins can set admin role. Contact support.';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
