-- Allow customers to read open job requests for dashboard "Live Requests" section.
-- (Pros already have "Pros select open job requests"; this adds customer access.)
DROP POLICY IF EXISTS "Customers select open job requests for dashboard" ON public.job_requests;
CREATE POLICY "Customers select open job requests for dashboard"
  ON public.job_requests FOR SELECT TO authenticated
  USING (status = 'open' AND expires_at > now());
