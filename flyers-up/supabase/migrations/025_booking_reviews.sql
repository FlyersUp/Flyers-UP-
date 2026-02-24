-- ============================================
-- Booking Reviews: Customer reviews for Pros after completed bookings
-- ============================================
-- One review per booking. Updates service_pros.rating and review_count.

CREATE TABLE IF NOT EXISTS public.booking_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE UNIQUE,
  customer_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  pro_id uuid NOT NULL REFERENCES public.service_pros(id) ON DELETE CASCADE,
  rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_booking_reviews_pro_id ON public.booking_reviews(pro_id);
CREATE INDEX IF NOT EXISTS idx_booking_reviews_booking_id ON public.booking_reviews(booking_id);

ALTER TABLE public.booking_reviews ENABLE ROW LEVEL SECURITY;

-- Customers can view reviews for bookings they participated in (customer or pro)
DROP POLICY IF EXISTS "Anyone can view booking reviews" ON public.booking_reviews;
CREATE POLICY "Anyone can view booking reviews"
  ON public.booking_reviews FOR SELECT
  TO authenticated
  USING (true);

-- Customers can insert their own review for a completed/awaiting_payment booking they own
DROP POLICY IF EXISTS "Customers can create own booking reviews" ON public.booking_reviews;
CREATE POLICY "Customers can create own booking reviews"
  ON public.booking_reviews FOR INSERT
  TO authenticated
  WITH CHECK (
    customer_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.bookings b
      WHERE b.id = booking_id
        AND b.customer_id = auth.uid()
        AND b.status IN ('completed', 'awaiting_payment')
    )
  );

-- No UPDATE or DELETE - reviews are immutable (simplifies aggregation)
-- Service role can update/delete if needed for moderation

-- Function to recalculate pro rating and review_count
CREATE OR REPLACE FUNCTION public.recalculate_pro_rating(p_pro_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_avg numeric;
  v_count integer;
BEGIN
  SELECT COALESCE(AVG(rating)::numeric(4,2), 0), COALESCE(COUNT(*), 0)
  INTO v_avg, v_count
  FROM public.booking_reviews
  WHERE pro_id = p_pro_id;

  UPDATE public.service_pros
  SET rating = v_avg, review_count = v_count
  WHERE id = p_pro_id;
END;
$$;

-- Trigger: after insert on booking_reviews, recalculate pro rating
CREATE OR REPLACE FUNCTION public.booking_reviews_after_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.recalculate_pro_rating(NEW.pro_id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_booking_reviews_after_insert ON public.booking_reviews;
CREATE TRIGGER trg_booking_reviews_after_insert
  AFTER INSERT ON public.booking_reviews
  FOR EACH ROW
  EXECUTE FUNCTION public.booking_reviews_after_insert();
