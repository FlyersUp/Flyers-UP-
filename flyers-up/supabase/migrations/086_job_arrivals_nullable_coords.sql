-- Allow arrival check-in without GPS (geolocation temporarily optional in app).
-- Re-tighten client/API to require lat/lng when re-enabling GPS verification.
ALTER TABLE public.job_arrivals
  ALTER COLUMN arrival_lat DROP NOT NULL,
  ALTER COLUMN arrival_lng DROP NOT NULL;

COMMENT ON COLUMN public.job_arrivals.arrival_lat IS 'Pro GPS at arrival when captured; NULL if check-in without geolocation';
COMMENT ON COLUMN public.job_arrivals.arrival_lng IS 'Pro GPS at arrival when captured; NULL if check-in without geolocation';
