-- ZIP for matching customer requests to pros (radius search)
ALTER TABLE public.job_requests
  ADD COLUMN IF NOT EXISTS location_zip TEXT;

CREATE INDEX IF NOT EXISTS idx_job_requests_open_zip
  ON public.job_requests (location_zip)
  WHERE status = 'open' AND location_zip IS NOT NULL;

COMMENT ON COLUMN public.job_requests.location_zip IS 'US ZIP5 for geographic matching; location may hold optional neighborhood text';

-- Best-effort backfill from free-text location
UPDATE public.job_requests
SET location_zip = substring(trim(location) from '\y(\d{5})\y')
WHERE location_zip IS NULL
  AND location ~ '\y\d{5}\y';
