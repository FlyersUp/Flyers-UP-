-- ============================================
-- Social proof: Fly Wall RPCs, weekly leaderboard, pro follows
-- Public-safe read paths via SECURITY DEFINER RPCs (no raw booking address exposure).
-- ============================================

-- 1. Neighborhood label: ZIP5 only or generic "Local area" (never street address).
CREATE OR REPLACE FUNCTION public.fly_wall_neighborhood_safe(p_address text)
RETURNS text
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
AS $$
  SELECT CASE
    WHEN p_address IS NULL OR btrim(p_address) = '' THEN 'Local area'
    WHEN (substring(p_address FROM '\y(\d{5})\y')) IS NOT NULL
      THEN 'ZIP ' || (substring(p_address FROM '\y(\d{5})\y'))
    ELSE 'Local area'
  END;
$$;

-- 2. Bookings eligible to appear on the Fly Wall (paid / confirmed completion, not disputed).
CREATE OR REPLACE FUNCTION public.fly_wall_booking_eligible(b public.bookings)
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT NOT COALESCE(b.dispute_open, false)
    AND (
      COALESCE(b.payment_lifecycle_status, '') IN ('final_paid', 'payout_ready', 'payout_sent')
      OR COALESCE(b.status, '') IN (
        'paid', 'payout_released', 'customer_confirmed', 'auto_confirmed', 'payout_eligible'
      )
      OR (
        COALESCE(b.status, '') = 'completed'
        AND COALESCE(upper(b.payment_status), '') = 'PAID'
      )
    );
$$;

COMMENT ON FUNCTION public.fly_wall_neighborhood_safe(text) IS 'Fly Wall: coarse location only (ZIP5), never full street address.';
COMMENT ON FUNCTION public.fly_wall_booking_eligible(public.bookings) IS 'True when booking may appear on Fly Wall (settled/confirmed, not disputed).';

-- 3. Fly Wall feed: newest job proof first.
CREATE OR REPLACE FUNCTION public.rpc_fly_wall_entries(p_limit integer, p_offset integer)
RETURNS TABLE (
  completion_id uuid,
  booking_id uuid,
  completed_at timestamptz,
  pro_id uuid,
  pro_display_name text,
  category_name text,
  neighborhood_label text,
  before_photo_urls text[],
  after_photo_urls text[],
  customer_rating integer,
  show_perfect_rating_badge boolean,
  pro_avatar_url text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    jc.id AS completion_id,
    b.id AS booking_id,
    jc.completed_at,
    sp.id AS pro_id,
    sp.display_name AS pro_display_name,
    COALESCE(sc.name, 'Service') AS category_name,
    public.fly_wall_neighborhood_safe(b.address::text) AS neighborhood_label,
    COALESCE(
      (
        SELECT ARRAY(
          SELECT e.elem->>'url'
          FROM jsonb_array_elements(COALESCE(b.photos_snapshot, '[]'::jsonb)) AS e(elem)
          WHERE e.elem->>'url' IS NOT NULL
            AND btrim(e.elem->>'url') <> ''
          LIMIT 2
        )
      ),
      ARRAY[]::text[]
    ) AS before_photo_urls,
    COALESCE(jc.after_photo_urls, ARRAY[]::text[]) AS after_photo_urls,
    br.rating AS customer_rating,
    (br.rating = 5) AS show_perfect_rating_badge,
    prof.avatar_url AS pro_avatar_url
  FROM public.job_completions jc
  INNER JOIN public.bookings b ON b.id = jc.booking_id
  INNER JOIN public.service_pros sp ON sp.id = jc.pro_id
  LEFT JOIN public.service_categories sc ON sc.id = sp.category_id
  INNER JOIN public.profiles prof ON prof.id = sp.user_id
  LEFT JOIN public.booking_reviews br
    ON br.booking_id = b.id
    AND COALESCE(br.is_public, true) = true
  WHERE public.fly_wall_booking_eligible(b)
    AND prof.account_status = 'active'
    AND sp.closed_at IS NULL
  ORDER BY jc.completed_at DESC
  LIMIT GREATEST(1, LEAST(p_limit, 50))
  OFFSET GREATEST(p_offset, 0);
$$;

-- 4. Weekly leaderboard (rolling 7 days). Min 3 lifetime completed jobs on eligible bookings.
CREATE OR REPLACE FUNCTION public.rpc_weekly_leaderboard(p_category_id uuid DEFAULT NULL)
RETURNS TABLE (
  rank bigint,
  pro_id uuid,
  pro_display_name text,
  category_name text,
  jobs_completed_week integer,
  average_rating numeric
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH eligible_bookings AS (
    SELECT b.id
    FROM public.bookings b
    WHERE public.fly_wall_booking_eligible(b)
  ),
  lifetime AS (
    SELECT jc.pro_id, COUNT(*)::integer AS total_jobs
    FROM public.job_completions jc
    WHERE jc.booking_id IN (SELECT eb.id FROM eligible_bookings eb)
    GROUP BY jc.pro_id
    HAVING COUNT(*) >= 3
  ),
  week_jobs AS (
    SELECT jc.pro_id, COUNT(*)::integer AS week_cnt
    FROM public.job_completions jc
    WHERE jc.booking_id IN (SELECT eb.id FROM eligible_bookings eb)
      AND jc.completed_at >= (now() - interval '7 days')
    GROUP BY jc.pro_id
  )
  SELECT
    ROW_NUMBER() OVER (
      ORDER BY
        (wj.week_cnt::numeric * COALESCE(sp.rating, 0)) DESC,
        COALESCE(sp.rating, 0) DESC NULLS LAST,
        wj.week_cnt DESC,
        sp.display_name ASC
    ) AS rank,
    sp.id AS pro_id,
    sp.display_name AS pro_display_name,
    COALESCE(sc.name, 'Service') AS category_name,
    wj.week_cnt AS jobs_completed_week,
    COALESCE(sp.rating, 0)::numeric AS average_rating
  FROM week_jobs wj
  INNER JOIN lifetime lt ON lt.pro_id = wj.pro_id
  INNER JOIN public.service_pros sp ON sp.id = wj.pro_id
  INNER JOIN public.profiles prof ON prof.id = sp.user_id
  LEFT JOIN public.service_categories sc ON sc.id = sp.category_id
  WHERE prof.account_status = 'active'
    AND sp.closed_at IS NULL
    AND sp.available = true
    AND (p_category_id IS NULL OR sp.category_id = p_category_id)
  ORDER BY
    (wj.week_cnt::numeric * COALESCE(sp.rating, 0)) DESC,
    COALESCE(sp.rating, 0) DESC NULLS LAST,
    wj.week_cnt DESC,
    sp.display_name ASC
  LIMIT 10;
$$;

-- 5. Pro profile: jobs, rating, repeat %, avg response (minutes).
CREATE OR REPLACE FUNCTION public.rpc_pro_performance_snapshot(p_pro_id uuid)
RETURNS TABLE (
  jobs_completed integer,
  avg_rating numeric,
  repeat_customer_pct numeric,
  avg_response_minutes numeric
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    COALESCE(
      (SELECT pr.jobs_completed FROM public.pro_reputation pr WHERE pr.pro_id = p_pro_id),
      (SELECT sp.jobs_completed FROM public.service_pros sp WHERE sp.id = p_pro_id),
      (
        SELECT COUNT(*)::integer
        FROM public.job_completions jc
        INNER JOIN public.bookings b ON b.id = jc.booking_id
        WHERE jc.pro_id = p_pro_id
          AND public.fly_wall_booking_eligible(b)
      ),
      0
    ) AS jobs_completed,
    COALESCE(
      (SELECT sp.rating FROM public.service_pros sp WHERE sp.id = p_pro_id),
      (SELECT pr.average_rating FROM public.pro_reputation pr WHERE pr.pro_id = p_pro_id),
      0::numeric
    ) AS avg_rating,
    COALESCE(
      (SELECT pr.repeat_customer_rate FROM public.pro_reputation pr WHERE pr.pro_id = p_pro_id),
      0::numeric
    ) AS repeat_customer_pct,
    (
      SELECT AVG(EXTRACT(EPOCH FROM (b.accepted_at - b.created_at)) / 60.0)::numeric
      FROM public.bookings b
      WHERE b.pro_id = p_pro_id
        AND b.accepted_at IS NOT NULL
        AND b.created_at IS NOT NULL
        AND b.accepted_at >= b.created_at
    ) AS avg_response_minutes;
$$;

-- 6. Follows (foundation only; no feed).
CREATE TABLE IF NOT EXISTS public.pro_follows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  followed_pro_id uuid NOT NULL REFERENCES public.service_pros (id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (follower_user_id, followed_pro_id)
);

CREATE INDEX IF NOT EXISTS idx_pro_follows_follower ON public.pro_follows (follower_user_id);
CREATE INDEX IF NOT EXISTS idx_pro_follows_pro ON public.pro_follows (followed_pro_id);

ALTER TABLE public.pro_follows ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users read own pro follows" ON public.pro_follows;
CREATE POLICY "Users read own pro follows"
  ON public.pro_follows FOR SELECT TO authenticated
  USING (follower_user_id = auth.uid());

DROP POLICY IF EXISTS "Customers insert own pro follows" ON public.pro_follows;
CREATE POLICY "Customers insert own pro follows"
  ON public.pro_follows FOR INSERT TO authenticated
  WITH CHECK (
    follower_user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND COALESCE(p.role, 'customer') = 'customer'
    )
    AND EXISTS (
      SELECT 1 FROM public.service_pros sp
      WHERE sp.id = followed_pro_id
        AND sp.available = true
        AND sp.closed_at IS NULL
    )
  );

DROP POLICY IF EXISTS "Users delete own pro follows" ON public.pro_follows;
CREATE POLICY "Users delete own pro follows"
  ON public.pro_follows FOR DELETE TO authenticated
  USING (follower_user_id = auth.uid());

-- 7. Indexes for Fly Wall / response-time aggregates
CREATE INDEX IF NOT EXISTS idx_bookings_pro_accepted_for_response
  ON public.bookings (pro_id, created_at DESC)
  WHERE accepted_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_job_completions_completed_booking
  ON public.job_completions (completed_at DESC, booking_id);

-- Grants: authenticated app users only (Fly Wall / leaderboard pages require sign-in).
REVOKE ALL ON FUNCTION public.rpc_fly_wall_entries(integer, integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.rpc_weekly_leaderboard(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.rpc_pro_performance_snapshot(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rpc_fly_wall_entries(integer, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_weekly_leaderboard(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_pro_performance_snapshot(uuid) TO authenticated;
