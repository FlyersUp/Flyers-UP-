-- Extend booking_reviews: tags (selectable highlights), is_public (private vs public)
ALTER TABLE public.booking_reviews
  ADD COLUMN IF NOT EXISTS tags text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS is_public boolean NOT NULL DEFAULT true;

COMMENT ON COLUMN public.booking_reviews.tags IS 'Selectable highlights: punctual, professional, quality_work, etc.';
COMMENT ON COLUMN public.booking_reviews.is_public IS 'When false, comment is private feedback (not shown on pro profile).';
