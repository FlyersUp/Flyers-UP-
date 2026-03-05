-- ============================================
-- MARKETPLACE RPC FUNCTIONS
-- ============================================
-- recompute_surge_for_cell: compute and persist surge multiplier for a cell/service
-- claim_demand_request: atomic claim by pro
-- ============================================

-- Helper: log marketplace event (called from other functions)
CREATE OR REPLACE FUNCTION public.log_marketplace_event(
  p_actor_type text,
  p_actor_id uuid,
  p_event_type text,
  p_payload jsonb DEFAULT '{}'
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.marketplace_events (actor_type, actor_id, event_type, payload)
  VALUES (p_actor_type, p_actor_id, p_event_type, p_payload);
END;
$$;

-- recompute_surge_for_cell: compute surge multiplier from open_requests/pros_online
-- Uses admin_settings surge_rules. Persists to demand_cells.
CREATE OR REPLACE FUNCTION public.recompute_surge_for_cell(
  p_cell_key text,
  p_service_slug text,
  p_open_requests integer DEFAULT 0,
  p_pros_online integer DEFAULT 0
)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_rules jsonb;
  v_enabled boolean;
  v_max_mult numeric;
  v_min_mult numeric;
  v_target numeric;
  v_ratio numeric;
  v_mult numeric;
  v_urgency_boost jsonb;
BEGIN
  -- Read surge_rules from admin_settings
  SELECT value INTO v_rules FROM public.admin_settings WHERE key = 'surge_rules' LIMIT 1;
  IF v_rules IS NULL THEN
    v_rules := '{"enabled": true, "maxMultiplier": 1.30, "minMultiplier": 1.00, "targetRequestsPerPro": 2.5}'::jsonb;
  END IF;

  v_enabled := COALESCE((v_rules->>'enabled')::boolean, true);
  v_max_mult := COALESCE((v_rules->>'maxMultiplier')::numeric, 1.30);
  v_min_mult := COALESCE((v_rules->>'minMultiplier')::numeric, 1.00);
  v_target := COALESCE((v_rules->>'targetRequestsPerPro')::numeric, 2.5);

  IF NOT v_enabled THEN
    v_mult := 1.0;
  ELSE
    -- ratio = open_requests / GREATEST(pros_online, 1)
    v_ratio := p_open_requests::numeric / GREATEST(p_pros_online, 1);

    -- if ratio <= target => 1.0, else multiplier = 1.0 + ((ratio - target) * 0.05)
    IF v_ratio <= v_target THEN
      v_mult := 1.0;
    ELSE
      v_mult := 1.0 + ((v_ratio - v_target) * 0.05);
    END IF;

    v_mult := GREATEST(v_min_mult, LEAST(v_max_mult, v_mult));
  END IF;

  -- Upsert demand_cells
  INSERT INTO public.demand_cells (cell_key, service_slug, open_requests, pros_online, surge_multiplier, updated_at)
  VALUES (p_cell_key, p_service_slug, p_open_requests, p_pros_online, v_mult, now())
  ON CONFLICT (cell_key, service_slug) DO UPDATE SET
    open_requests = EXCLUDED.open_requests,
    pros_online = EXCLUDED.pros_online,
    surge_multiplier = EXCLUDED.surge_multiplier,
    updated_at = EXCLUDED.updated_at;

  -- Log event
  PERFORM log_marketplace_event('system', NULL, 'surge_recomputed', jsonb_build_object(
    'cell_key', p_cell_key,
    'service_slug', p_service_slug,
    'open_requests', p_open_requests,
    'pros_online', p_pros_online,
    'surge_multiplier', v_mult
  ));

  RETURN v_mult;
END;
$$;

-- claim_demand_request: atomic claim. Only pros can call. Uses auth.uid() to resolve pro_id.
CREATE OR REPLACE FUNCTION public.claim_demand_request(p_request_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_pro_id uuid;
  v_row record;
BEGIN
  -- Resolve pro_id from auth.uid()
  SELECT id INTO v_pro_id FROM public.service_pros WHERE user_id = auth.uid() LIMIT 1;
  IF v_pro_id IS NULL THEN
    RAISE EXCEPTION 'Not a pro user';
  END IF;

  -- Atomic update: only if status='open' and not yet claimed
  UPDATE public.demand_requests
  SET
    status = 'claimed',
    claimed_by_pro_id = v_pro_id,
    claimed_at = now()
  WHERE id = p_request_id
    AND status = 'open'
    AND claimed_by_pro_id IS NULL
  RETURNING * INTO v_row;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Request already claimed or not found';
  END IF;

  -- Log event
  PERFORM log_marketplace_event('pro', auth.uid(), 'request_claimed', jsonb_build_object(
    'request_id', p_request_id,
    'pro_id', v_pro_id,
    'final_price_cents', v_row.final_price_cents
  ));

  RETURN to_jsonb(v_row);
END;
$$;

-- Grant execute to authenticated
GRANT EXECUTE ON FUNCTION public.recompute_surge_for_cell(text, text, integer, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.recompute_surge_for_cell(text, text, integer, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.claim_demand_request(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.log_marketplace_event(text, uuid, text, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.log_marketplace_event(text, uuid, text, jsonb) TO service_role;
