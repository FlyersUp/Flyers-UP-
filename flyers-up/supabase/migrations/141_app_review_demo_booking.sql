-- Apple App Review: marks bookings created by reviewer@flyersup.app for demo-only automation
-- (availability bypass, auto-accept, simulated payments, tracking progression). Never set for other users.

ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS app_review_demo boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.bookings.app_review_demo IS
  'True only for Apple App Review demo bookings (reviewer@flyersup.app). Enables scoped test automation.';

CREATE INDEX IF NOT EXISTS idx_bookings_app_review_demo
  ON public.bookings (customer_id)
  WHERE app_review_demo = true;
