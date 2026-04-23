-- ============================================
-- HYBRID MARKETPLACE: category x borough gate,
-- concierge match_requests + outreach audit,
-- pro supply signals on service_pros
-- ============================================

-- ---------- A) Pro supply fields (service_pros) ----------
ALTER TABLE public.service_pros
  ADD COLUMN IF NOT EXISTS is_verified boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_active_this_week boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_paused boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS manual_match_priority integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_confirmed_available_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_matched_at timestamptz,
  ADD COLUMN IF NOT EXISTS recent_response_score numeric;

COMMENT ON COLUMN public.service_pros.is_verified IS 'Kept in sync with identity_verified for gate queries / admin ranking';
COMMENT ON COLUMN public.service_pros.is_active_this_week IS 'Explicit weekly intent (ops / pro UI). Default false; do not infer supply from this alone.';
COMMENT ON COLUMN public.service_pros.is_paused IS 'Ops or pro pause: excluded from matchable supply when true';
COMMENT ON COLUMN public.service_pros.manual_match_priority IS 'Higher = preferred in concierge candidate ranking';
COMMENT ON COLUMN public.service_pros.last_confirmed_available_at IS 'Last time pro confirmed availability';
COMMENT ON COLUMN public.service_pros.last_matched_at IS 'Last concierge match (fairness penalty in ranking)';
COMMENT ON COLUMN public.service_pros.recent_response_score IS 'Optional 0..1 responsiveness signal';

-- One-time backfill + keep aligned with existing badge column
UPDATE public.service_pros
SET is_verified = COALESCE(identity_verified, false)
WHERE is_verified IS DISTINCT FROM COALESCE(identity_verified, false);

CREATE OR REPLACE FUNCTION public.service_pros_sync_is_verified()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.is_verified := COALESCE(NEW.identity_verified, false);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_service_pros_sync_is_verified ON public.service_pros;
CREATE TRIGGER trg_service_pros_sync_is_verified
  BEFORE INSERT OR UPDATE OF identity_verified ON public.service_pros
  FOR EACH ROW
  EXECUTE FUNCTION public.service_pros_sync_is_verified();

-- ---------- B) Admin helper (RLS policies) ----------
CREATE OR REPLACE FUNCTION public.is_profile_admin(check_uid uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = check_uid AND p.role = 'admin'
  );
$$;

REVOKE ALL ON FUNCTION public.is_profile_admin(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_profile_admin(uuid) TO authenticated;

-- ---------- C) Gate resolution (count + overrides) ----------
CREATE OR REPLACE FUNCTION public.resolve_category_borough_gate(
  p_active_count integer,
  p_force_hidden boolean,
  p_force_visible boolean,
  p_threshold_strong integer,
  OUT o_visible_state text,
  OUT o_is_customer_visible boolean
)
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  base text;
BEGIN
  IF COALESCE(p_force_hidden, false) THEN
    o_visible_state := 'inactive';
    o_is_customer_visible := false;
    RETURN;
  END IF;

  IF p_active_count IS NULL OR p_active_count < 0 THEN
    base := 'inactive';
  ELSIF p_active_count >= GREATEST(1, p_threshold_strong) THEN
    base := 'strong';
  ELSIF p_active_count >= 1 THEN
    base := 'weak';
  ELSE
    base := 'inactive';
  END IF;

  IF COALESCE(p_force_visible, false) THEN
    o_is_customer_visible := true;
    IF base = 'inactive' THEN
      o_visible_state := 'weak';
    ELSE
      o_visible_state := base;
    END IF;
    RETURN;
  END IF;

  o_visible_state := base;
  o_is_customer_visible := (base <> 'inactive');
END;
$$;

-- ---------- D) category_borough_status ----------
CREATE TABLE IF NOT EXISTS public.category_borough_status (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  occupation_slug text NOT NULL,
  borough_slug text NOT NULL,
  active_pro_count integer NOT NULL DEFAULT 0,
  visible_state text NOT NULL CHECK (visible_state IN ('strong', 'weak', 'inactive')),
  is_customer_visible boolean NOT NULL DEFAULT false,
  force_hidden boolean NOT NULL DEFAULT false,
  force_visible boolean NOT NULL DEFAULT false,
  last_checked_at timestamptz NOT NULL DEFAULT now(),
  ops_note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (occupation_slug, borough_slug)
);

CREATE INDEX IF NOT EXISTS idx_category_borough_status_visible
  ON public.category_borough_status (is_customer_visible, borough_slug);

COMMENT ON TABLE public.category_borough_status IS 'Active category gate: occupation x NYC borough supply + overrides';

DROP TRIGGER IF EXISTS category_borough_status_updated_at ON public.category_borough_status;
CREATE TRIGGER category_borough_status_updated_at
  BEFORE UPDATE ON public.category_borough_status
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.category_borough_status ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS category_borough_status_select_public ON public.category_borough_status;
CREATE POLICY category_borough_status_select_public
  ON public.category_borough_status FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS category_borough_status_admin_write ON public.category_borough_status;
CREATE POLICY category_borough_status_admin_write
  ON public.category_borough_status FOR ALL
  TO authenticated
  USING (public.is_profile_admin(auth.uid()))
  WITH CHECK (public.is_profile_admin(auth.uid()));

-- ---------- E) match_requests ----------
CREATE TABLE IF NOT EXISTS public.match_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  occupation_slug text NOT NULL,
  borough_slug text NOT NULL,
  preferred_time text,
  urgency text NOT NULL CHECK (urgency IN ('asap', 'today', 'flexible')),
  notes text,
  status text NOT NULL DEFAULT 'pending_review' CHECK (status IN (
    'pending_review',
    'candidate_selected',
    'offer_sent',
    'accepted',
    'declined',
    'expired',
    'matched',
    'fallback_needed'
  )),
  matched_pro_id uuid REFERENCES public.service_pros(id) ON DELETE SET NULL,
  booking_id uuid REFERENCES public.bookings(id) ON DELETE SET NULL,
  matched_by_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_match_requests_status_created ON public.match_requests (status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_match_requests_customer ON public.match_requests (customer_id);

COMMENT ON TABLE public.match_requests IS 'Concierge / manual matchmaking requests (booking-first hybrid fallback)';

DROP TRIGGER IF EXISTS match_requests_updated_at ON public.match_requests;
CREATE TRIGGER match_requests_updated_at
  BEFORE UPDATE ON public.match_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.match_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS match_requests_customer_insert ON public.match_requests;
CREATE POLICY match_requests_customer_insert
  ON public.match_requests FOR INSERT
  TO authenticated
  WITH CHECK (customer_id = auth.uid());

DROP POLICY IF EXISTS match_requests_select_own_or_admin ON public.match_requests;
CREATE POLICY match_requests_select_own_or_admin
  ON public.match_requests FOR SELECT
  TO authenticated
  USING (customer_id = auth.uid() OR public.is_profile_admin(auth.uid()));

DROP POLICY IF EXISTS match_requests_admin_update ON public.match_requests;
CREATE POLICY match_requests_admin_update
  ON public.match_requests FOR UPDATE
  TO authenticated
  USING (public.is_profile_admin(auth.uid()))
  WITH CHECK (public.is_profile_admin(auth.uid()));

-- ---------- F) match_outreach_log ----------
CREATE TABLE IF NOT EXISTS public.match_outreach_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  match_request_id uuid NOT NULL REFERENCES public.match_requests(id) ON DELETE CASCADE,
  pro_id uuid NOT NULL REFERENCES public.service_pros(id) ON DELETE CASCADE,
  outreach_channel text NOT NULL CHECK (outreach_channel IN ('push', 'sms', 'manual')),
  outreach_status text NOT NULL DEFAULT 'not_contacted' CHECK (outreach_status IN (
    'not_contacted',
    'push_sent',
    'sms_sent',
    'viewed',
    'accepted',
    'declined',
    'no_response'
  )),
  sent_at timestamptz NOT NULL DEFAULT now(),
  responded_at timestamptz,
  notes text,
  created_by_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_match_outreach_request ON public.match_outreach_log (match_request_id);

COMMENT ON TABLE public.match_outreach_log IS 'Audit trail for concierge outreach to pros';

ALTER TABLE public.match_outreach_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS match_outreach_admin_all ON public.match_outreach_log;
CREATE POLICY match_outreach_admin_all
  ON public.match_outreach_log FOR ALL
  TO authenticated
  USING (public.is_profile_admin(auth.uid()))
  WITH CHECK (public.is_profile_admin(auth.uid()));

-- ---------- G) Normalize borough token for comparisons ----------
CREATE OR REPLACE FUNCTION public.normalize_borough_token(p_raw text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT NULLIF(
    regexp_replace(
      lower(trim(COALESCE(p_raw, ''))),
      E'\\s+',
      '-',
      'g'
    ),
    ''
  );
$$;

-- ---------- H) Matchable pro for gate (per occupation + borough) ----------
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
    AND sp.is_active_this_week = true
    AND sp.is_paused = false
    AND sp.available = true
    AND sp.closed_at IS NULL
    AND COALESCE(p.account_status, 'active') = 'active'
    AND (
      COALESCE(sp.service_area_mode, 'radius') IN ('radius', 'zip_codes')
      OR (
        sp.service_area_mode = 'boroughs'
        AND EXISTS (
          SELECT 1
          FROM unnest(COALESCE(sp.service_area_values, ARRAY[]::text[])) AS v(val)
          WHERE public.normalize_borough_token(v.val) = public.normalize_borough_token(p_borough_slug)
        )
      )
    );
$$;

REVOKE ALL ON FUNCTION public.count_matchable_pros_for_occupation_borough(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.count_matchable_pros_for_occupation_borough(text, text) TO authenticated, anon;

-- ---------- I) Refresh all occupation x borough rows ----------
CREATE OR REPLACE FUNCTION public.refresh_category_borough_status(p_threshold_strong integer DEFAULT 3)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_occ record;
  v_boro text;
  v_count integer;
  v_visible text;
  v_cust_vis boolean;
  boros text[] := ARRAY['manhattan', 'brooklyn', 'queens', 'bronx', 'staten-island'];
BEGIN
  FOR v_occ IN
    SELECT slug FROM public.occupations WHERE COALESCE(is_active, true) = true
  LOOP
    FOREACH v_boro IN ARRAY boros
    LOOP
      v_count := public.count_matchable_pros_for_occupation_borough(v_occ.slug, v_boro);

      SELECT g.o_visible_state, g.o_is_customer_visible
      INTO v_visible, v_cust_vis
      FROM public.resolve_category_borough_gate(v_count, false, false, p_threshold_strong) AS g;

      INSERT INTO public.category_borough_status (
        occupation_slug,
        borough_slug,
        active_pro_count,
        visible_state,
        is_customer_visible,
        force_hidden,
        force_visible,
        last_checked_at,
        updated_at
      )
      VALUES (
        v_occ.slug,
        v_boro,
        v_count,
        v_visible,
        v_cust_vis,
        false,
        false,
        now(),
        now()
      )
      ON CONFLICT (occupation_slug, borough_slug) DO UPDATE
      SET
        active_pro_count = EXCLUDED.active_pro_count,
        visible_state = (
          SELECT gg.o_visible_state
          FROM public.resolve_category_borough_gate(
            EXCLUDED.active_pro_count,
            category_borough_status.force_hidden,
            category_borough_status.force_visible,
            p_threshold_strong
          ) AS gg
        ),
        is_customer_visible = (
          SELECT gg.o_is_customer_visible
          FROM public.resolve_category_borough_gate(
            EXCLUDED.active_pro_count,
            category_borough_status.force_hidden,
            category_borough_status.force_visible,
            p_threshold_strong
          ) AS gg
        ),
        last_checked_at = now(),
        updated_at = now();
    END LOOP;
  END LOOP;
END;
$$;

REVOKE ALL ON FUNCTION public.refresh_category_borough_status(integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.refresh_category_borough_status(integer) TO service_role;

-- Initial materialization (best-effort; cron / admin can re-run)
SELECT public.refresh_category_borough_status(3);
