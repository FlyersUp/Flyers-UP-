-- Pros can read requests they have claimed
DROP POLICY IF EXISTS "Pros read own claimed demand_requests" ON public.demand_requests;
CREATE POLICY "Pros read own claimed demand_requests"
  ON public.demand_requests FOR SELECT TO authenticated
  USING (
    status = 'claimed'
    AND claimed_by_pro_id IN (SELECT id FROM public.service_pros WHERE user_id = auth.uid())
  );
