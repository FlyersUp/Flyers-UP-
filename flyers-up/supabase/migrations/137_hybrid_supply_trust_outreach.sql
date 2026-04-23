-- ============================================
-- Supply trust + outreach control (launch-critical)
-- 1) is_active_this_week: never imply supply without intent/signals
-- 2) Gate: drop ghost / serial no-response pros
-- 3) Outreach: smaller default cap, one pro per API wave
-- ============================================

DROP FUNCTION IF EXISTS public.service_pro_effective_active_this_week(boolean, timestamptz, timestamptz, numeric, uuid, timestamptz);

-- ---------- 1) Manual weekly flag: default false + hard reset ----------
ALTER TABLE public.service_pros
  ALTER COLUMN is_active_this_week SET DEFAULT false;

COMMENT ON COLUMN public.service_pros.is_active_this_week IS
  'Explicit only: pro or ops toggled "taking work this week." Must NOT default true — supply uses signals in SQL. Default false.';

-- Clear stored "true" that came from the old default / broad backfill.
-- Gate eligibility still uses last_confirmed, bookings, outreach, response_score, and this flag when explicitly true.
UPDATE public.service_pros
SET is_active_this_week = false
WHERE is_active_this_week IS DISTINCT FROM false;

-- ---------- 2) Effective active (signals only — no "profile touched" as supply) ----------
CREATE OR REPLACE FUNCTION public.service_pro_effective_active_this_week(
  p_is_active boolean,
  p_last_confirmed timestamptz,
  p_last_matched timestamptz,
  p_recent_response numeric,
  p_pro_id uuid
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    COALESCE(p_is_active, false) = true
    OR COALESCE(p_last_confirmed, '-infinity'::timestamptz) > (now() - interval '7 days')
    OR COALESCE(p_last_matched, '-infinity'::timestamptz) > (now() - interval '7 days')
    OR COALESCE(p_recent_response, 0) >= 0.35
    OR EXISTS (
      SELECT 1
      FROM public.match_outreach_log mol
      WHERE mol.pro_id = p_pro_id
        AND mol.responded_at IS NOT NULL
        AND mol.responded_at > (now() - interval '7 days')
    )
    OR EXISTS (
      SELECT 1
      FROM public.bookings b
      WHERE b.pro_id = p_pro_id
        AND b.created_at > (now() - interval '7 days')
        AND b.cancelled_at IS NULL
        AND COALESCE(lower(b.status), '') NOT IN ('cancelled', 'canceled', 'declined', 'expired')
    );
$$;

REVOKE ALL ON FUNCTION public.service_pro_effective_active_this_week(boolean, timestamptz, timestamptz, numeric, uuid) FROM PUBLIC;

-- ---------- 3) Gate count: ghosts + chronic no-response excluded ----------
CREATE OR REPLACE FUNCTION public.count_matchable_pros_for_occupation_borough(
  p_occupation_slug text,
  p_borough_slug text
)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*)::integer
  FROM public.service_pros sp
  INNER JOIN public.occupations o ON o.id = sp.occupation_id
  INNER JOIN public.profiles p ON p.id = sp.user_id
  WHERE o.slug = p_occupation_slug
    AND COALESCE(o.is_active, true) = true
    AND sp.is_verified = true
    AND sp.is_paused = false
    AND sp.available = true
    AND sp.closed_at IS NULL
    AND COALESCE(p.account_status, 'active') = 'active'
    AND public.service_pro_effective_active_this_week(
      sp.is_active_this_week,
      sp.last_confirmed_available_at,
      sp.last_matched_at,
      sp.recent_response_score,
      sp.id
    )
    AND public.service_pro_serves_borough_for_gate(
      sp.service_area_mode,
      COALESCE(sp.service_area_values, ARRAY[]::text[]),
      p_borough_slug
    )
    -- Chronic no-response on outreach (verified but "ghost" behavior)
    AND (
      SELECT COUNT(*)::integer
      FROM public.match_outreach_log mol
      WHERE mol.pro_id = sp.id
        AND mol.outreach_status = 'no_response'
        AND mol.sent_at > (now() - interval '30 days')
    ) < 2
    -- Dormant account with no supply signals (verified-only zombies)
    AND NOT (
      COALESCE(p.updated_at, '-infinity'::timestamptz) < (now() - interval '75 days')
      AND COALESCE(sp.last_confirmed_available_at, '-infinity'::timestamptz) < (now() - interval '30 days')
      AND COALESCE(sp.last_matched_at, '-infinity'::timestamptz) < (now() - interval '30 days')
      AND NOT EXISTS (
        SELECT 1
        FROM public.bookings b
        WHERE b.pro_id = sp.id
          AND b.created_at > (now() - interval '60 days')
          AND b.cancelled_at IS NULL
      )
      AND NOT EXISTS (
        SELECT 1
        FROM public.match_outreach_log mol
        WHERE mol.pro_id = sp.id
          AND mol.responded_at IS NOT NULL
          AND mol.responded_at > (now() - interval '60 days')
      )
      AND COALESCE(sp.recent_response_score, 0) < 0.22
    );
$$;

-- ---------- 4) Tighter outreach defaults ----------
ALTER TABLE public.match_requests
  ALTER COLUMN outreach_cap SET DEFAULT 3;

COMMENT ON COLUMN public.match_requests.outreach_cap IS 'Max distinct pros contacted per request; default 3 to avoid spray-and-pray.';

-- ---------- 5) Refresh gate after tightening ----------
SELECT public.refresh_category_borough_status(3);
