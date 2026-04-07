-- Add lifetime verified job count to weekly leaderboard RPC (customer “Top pros” trust copy).
CREATE OR REPLACE FUNCTION public.rpc_weekly_leaderboard(p_category_id uuid DEFAULT NULL)
RETURNS TABLE (
  rank bigint,
  pro_id uuid,
  pro_display_name text,
  category_name text,
  jobs_completed_week integer,
  average_rating numeric,
  jobs_completed_lifetime integer
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
    COALESCE(sp.rating, 0)::numeric AS average_rating,
    lt.total_jobs AS jobs_completed_lifetime
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
