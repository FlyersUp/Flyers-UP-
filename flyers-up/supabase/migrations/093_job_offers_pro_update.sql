-- Allow pros to update their own offers (price / message)
DROP POLICY IF EXISTS "Pros update own job offers" ON public.job_offers;
CREATE POLICY "Pros update own job offers"
  ON public.job_offers FOR UPDATE TO authenticated
  USING (pro_id IN (SELECT id FROM public.service_pros WHERE user_id = auth.uid()))
  WITH CHECK (pro_id IN (SELECT id FROM public.service_pros WHERE user_id = auth.uid()));
