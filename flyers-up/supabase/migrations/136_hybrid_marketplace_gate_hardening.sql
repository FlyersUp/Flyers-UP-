-- ============================================
-- HYBRID marketplace hardening (NYC launch)
-- - Stricter borough gate (boroughs mode only)
-- - Derived "active this week" for counts
-- - Outreach dedupe + request caps + logging fields
-- ============================================

-- ---------- A) Safer default for manual weekly flag ----------
ALTER TABLE public.service_pros
  ALTER COLUMN is_active_this_week SET DEFAULT false;

COMMENT ON COLUMN public.service_pros.is_active_this_week IS
  'Manual override: when true, pro counts as active-this-week even without recent signals. Default false; gate also uses automated signals.';

-- Do not backfill is_active_this_week to true: that reintroduces "fake supply."
-- Eligibility uses service_pro_effective_active_this_week(...) from real signals + explicit toggle only.

-- ---------- B) Effective active + borough gate primitives ----------
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

CREATE OR REPLACE FUNCTION public.service_pro_serves_borough_for_gate(
  p_mode text,
  p_values text[],
  p_borough_slug text
)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    lower(COALESCE(p_mode, 'radius')) = 'boroughs'
    AND COALESCE(array_length(p_values, 1), 0) > 0
    AND EXISTS (
      SELECT 1
      FROM unnest(COALESCE(p_values, ARRAY[]::text[])) AS v(val)
      WHERE public.normalize_borough_token(v.val) = public.normalize_borough_token(p_borough_slug)
    );
$$;

REVOKE ALL ON FUNCTION public.service_pro_serves_borough_for_gate(text, text[], text) FROM PUBLIC;

-- ---------- C) Replace matchable count (gate-critical) ----------
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
    );
$$;

-- ---------- D) match_requests: audit + caps ----------
ALTER TABLE public.match_requests
  ADD COLUMN IF NOT EXISTS matched_at timestamptz,
  ADD COLUMN IF NOT EXISTS outreach_cap integer NOT NULL DEFAULT 5,
  ADD COLUMN IF NOT EXISTS outreach_attempt_count integer NOT NULL DEFAULT 0;

COMMENT ON COLUMN public.match_requests.outreach_cap IS 'Max distinct pros to contact per request (spam guard).';
COMMENT ON COLUMN public.match_requests.outreach_attempt_count IS 'Denormalized count of outreach rows; maintained by trigger.';

UPDATE public.match_requests mr
SET matched_at = mr.updated_at
WHERE mr.status = 'matched' AND mr.matched_at IS NULL AND mr.matched_pro_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.match_outreach_after_insert_sync()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.match_requests
  SET
    outreach_attempt_count = outreach_attempt_count + 1,
    updated_at = now()
  WHERE id = NEW.match_request_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_match_outreach_sync ON public.match_outreach_log;
CREATE TRIGGER trg_match_outreach_sync
  AFTER INSERT ON public.match_outreach_log
  FOR EACH ROW
  EXECUTE FUNCTION public.match_outreach_after_insert_sync();

-- Backfill counter from existing rows
UPDATE public.match_requests mr
SET outreach_attempt_count = sub.cnt
FROM (
  SELECT match_request_id, COUNT(*)::integer AS cnt
  FROM public.match_outreach_log
  GROUP BY match_request_id
) sub
WHERE mr.id = sub.match_request_id;

-- One outreach row per (request, pro) — prevents duplicate spam
DELETE FROM public.match_outreach_log mol
USING public.match_outreach_log keep
WHERE mol.match_request_id = keep.match_request_id
  AND mol.pro_id = keep.pro_id
  AND mol.ctid < keep.ctid;

CREATE UNIQUE INDEX IF NOT EXISTS uq_match_outreach_request_pro
  ON public.match_outreach_log (match_request_id, pro_id);

CREATE INDEX IF NOT EXISTS idx_match_outreach_pro_responded
  ON public.match_outreach_log (pro_id, responded_at DESC NULLS LAST);

CREATE INDEX IF NOT EXISTS idx_category_borough_occ_boro
  ON public.category_borough_status (occupation_slug, borough_slug);

CREATE INDEX IF NOT EXISTS idx_service_pros_occ_active_week
  ON public.service_pros (occupation_id, is_active_this_week)
  WHERE closed_at IS NULL AND is_paused = false;

CREATE INDEX IF NOT EXISTS idx_bookings_pro_created
  ON public.bookings (pro_id, created_at DESC);

-- ---------- E) Re-materialize gate after logic change ----------
SELECT public.refresh_category_borough_status(3);
