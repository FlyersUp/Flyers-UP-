-- ============================================
-- MIGRATION: Hoarding / Extreme Clutter lane (dormant) + Scope Reviews
-- ============================================
-- Adds:
-- 1) Pro opt-in flags + future specialty pricing hooks
-- 2) service_categories.is_public (hide hoarding from public lists)
-- 3) scope_reviews table for re-quote / scope change requests
--
-- Safe to re-run (idempotent).
-- ============================================

-- ============================================
-- 1) PRO OPT-IN FLAGS + SPECIALTY PRICING HOOKS
-- ============================================
ALTER TABLE public.service_pros
  ADD COLUMN IF NOT EXISTS accepts_hoarding_jobs boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS specialty_min_price_cents integer NULL,
  ADD COLUMN IF NOT EXISTS specialty_requires_photos boolean NOT NULL DEFAULT false;

-- ============================================
-- 2) CATEGORY VISIBILITY + HIDDEN HOARDING CATEGORY
-- ============================================
ALTER TABLE public.service_categories
  ADD COLUMN IF NOT EXISTS is_public boolean NOT NULL DEFAULT true;

-- Ensure hoarding category exists and is hidden from public lists
INSERT INTO public.service_categories (slug, name, description, icon, is_public)
VALUES (
  'hoarding',
  'Hoarding / Extreme Clutter',
  'Specialty lane for hoarding / extreme clutter projects.',
  '🧺',
  false
)
ON CONFLICT (slug) DO UPDATE
SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  icon = EXCLUDED.icon,
  is_public = false;

-- ============================================
-- 3) SCOPE REVIEWS (RE-QUOTE / STOP-WORK)
-- ============================================
CREATE TABLE IF NOT EXISTS public.scope_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  requested_by uuid NOT NULL REFERENCES public.profiles(id),
  reason text NOT NULL,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'resolved', 'rejected')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_scope_reviews_booking_id ON public.scope_reviews(booking_id);
CREATE INDEX IF NOT EXISTS idx_scope_reviews_created_at ON public.scope_reviews(created_at);

ALTER TABLE public.scope_reviews ENABLE ROW LEVEL SECURITY;

-- Only booking participants (customer or pro) can read scope reviews for that booking
DROP POLICY IF EXISTS "Booking participants can view scope reviews" ON public.scope_reviews;
CREATE POLICY "Booking participants can view scope reviews"
  ON public.scope_reviews FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.bookings b
      WHERE b.id = scope_reviews.booking_id
        AND (
          b.customer_id = auth.uid()
          OR b.pro_id IN (SELECT id FROM public.service_pros WHERE user_id = auth.uid())
        )
    )
  );

-- Only booking participants can create scope reviews, and requested_by must be the current user
DROP POLICY IF EXISTS "Booking participants can create scope reviews" ON public.scope_reviews;
CREATE POLICY "Booking participants can create scope reviews"
  ON public.scope_reviews FOR INSERT
  TO authenticated
  WITH CHECK (
    requested_by = auth.uid()
    AND EXISTS (
      SELECT 1
      FROM public.bookings b
      WHERE b.id = scope_reviews.booking_id
        AND (
          b.customer_id = auth.uid()
          OR b.pro_id IN (SELECT id FROM public.service_pros WHERE user_id = auth.uid())
        )
    )
  );


