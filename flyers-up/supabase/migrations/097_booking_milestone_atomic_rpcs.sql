-- Atomic milestone transitions (single transaction, row locks). Service role only.

CREATE OR REPLACE FUNCTION public.booking_milestone_start_atomic(
  p_booking_id uuid,
  p_service_pro_id uuid,
  p_milestone_index integer,
  p_actor_user_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  b record;
  v_row record;
  v_prev record;
  v_now timestamptz := now();
  v_n int;
BEGIN
  IF p_milestone_index < 0 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'bad_index');
  END IF;

  SELECT id, pro_id, status, is_multi_day, dispute_open
  INTO b
  FROM public.bookings
  WHERE id = p_booking_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'booking_not_found');
  END IF;

  IF b.pro_id IS DISTINCT FROM p_service_pro_id THEN
    RETURN jsonb_build_object('ok', false, 'error', 'forbidden');
  END IF;

  IF b.dispute_open IS TRUE THEN
    RETURN jsonb_build_object('ok', false, 'error', 'dispute_open');
  END IF;

  IF b.is_multi_day IS NOT TRUE THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_multi_day');
  END IF;

  IF b.status IS DISTINCT FROM 'in_progress' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'bad_booking_status');
  END IF;

  SELECT * INTO v_row
  FROM public.booking_milestones
  WHERE booking_id = p_booking_id AND milestone_index = p_milestone_index
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'milestone_not_found');
  END IF;

  IF v_row.status IS DISTINCT FROM 'pending' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'bad_milestone_status');
  END IF;

  IF p_milestone_index > 0 THEN
    SELECT * INTO v_prev
    FROM public.booking_milestones
    WHERE booking_id = p_booking_id AND milestone_index = p_milestone_index - 1
    FOR UPDATE;
    IF NOT FOUND THEN
      RETURN jsonb_build_object('ok', false, 'error', 'prev_not_found');
    END IF;
    IF v_prev.status NOT IN ('confirmed', 'auto_confirmed') THEN
      RETURN jsonb_build_object('ok', false, 'error', 'prev_not_confirmed');
    END IF;
  END IF;

  UPDATE public.booking_milestones
  SET
    status = 'in_progress',
    started_at = v_now,
    updated_at = v_now
  WHERE id = v_row.id AND status = 'pending';

  GET DIAGNOSTICS v_n = ROW_COUNT;
  IF v_n = 0 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'concurrent_update');
  END IF;

  UPDATE public.bookings
  SET
    current_milestone_index = p_milestone_index,
    progress_status = 'milestone_active'
  WHERE id = p_booking_id;

  INSERT INTO public.booking_progress_events (booking_id, milestone_id, actor_user_id, event_type, event_payload)
  VALUES (
    p_booking_id,
    v_row.id,
    p_actor_user_id,
    'milestone_started',
    jsonb_build_object('milestone_index', p_milestone_index)
  );

  RETURN jsonb_build_object('ok', true, 'milestone_id', v_row.id);
END;
$$;

CREATE OR REPLACE FUNCTION public.booking_milestone_complete_atomic(
  p_booking_id uuid,
  p_service_pro_id uuid,
  p_milestone_index integer,
  p_proof_photos jsonb,
  p_proof_notes text,
  p_actor_user_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  b record;
  v_row record;
  v_now timestamptz := now();
  v_n int;
  v_wh int;
  v_hours int;
  v_due timestamptz;
  v_photos jsonb;
BEGIN
  IF p_milestone_index < 0 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'bad_index');
  END IF;

  v_photos := COALESCE(p_proof_photos, '[]'::jsonb);
  IF jsonb_typeof(v_photos) IS DISTINCT FROM 'array' THEN
    v_photos := '[]'::jsonb;
  END IF;

  SELECT id, pro_id, status, is_multi_day, dispute_open, auto_confirm_window_hours
  INTO b
  FROM public.bookings
  WHERE id = p_booking_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'booking_not_found');
  END IF;

  IF b.pro_id IS DISTINCT FROM p_service_pro_id THEN
    RETURN jsonb_build_object('ok', false, 'error', 'forbidden');
  END IF;

  IF b.dispute_open IS TRUE THEN
    RETURN jsonb_build_object('ok', false, 'error', 'dispute_open');
  END IF;

  IF b.is_multi_day IS NOT TRUE THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_multi_day');
  END IF;

  IF b.status IS DISTINCT FROM 'in_progress' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'bad_booking_status');
  END IF;

  v_wh := COALESCE(b.auto_confirm_window_hours, 24);
  v_hours := GREATEST(1, LEAST(168, v_wh));
  v_due := v_now + make_interval(hours => v_hours);

  SELECT * INTO v_row
  FROM public.booking_milestones
  WHERE booking_id = p_booking_id AND milestone_index = p_milestone_index
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'milestone_not_found');
  END IF;

  IF v_row.status IS DISTINCT FROM 'in_progress' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'bad_milestone_status');
  END IF;

  UPDATE public.booking_milestones
  SET
    status = 'completed_pending_confirmation',
    completed_at = v_now,
    confirmation_due_at = v_due,
    proof_photos = v_photos,
    proof_notes = NULLIF(trim(p_proof_notes), ''),
    updated_at = v_now
  WHERE id = v_row.id AND status = 'in_progress';

  GET DIAGNOSTICS v_n = ROW_COUNT;
  IF v_n = 0 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'concurrent_update');
  END IF;

  UPDATE public.bookings
  SET progress_status = 'milestone_pending_confirmation'
  WHERE id = p_booking_id;

  INSERT INTO public.booking_progress_events (booking_id, milestone_id, actor_user_id, event_type, event_payload)
  VALUES (
    p_booking_id,
    v_row.id,
    p_actor_user_id,
    'milestone_completed',
    jsonb_build_object('milestone_index', p_milestone_index, 'proof_count', jsonb_array_length(v_photos))
  );

  RETURN jsonb_build_object('ok', true, 'milestone_id', v_row.id, 'confirmation_due_at', v_due);
END;
$$;

CREATE OR REPLACE FUNCTION public.booking_milestone_confirm_atomic(
  p_booking_id uuid,
  p_customer_id uuid,
  p_milestone_index integer,
  p_actor_user_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  b record;
  v_row record;
  v_now timestamptz := now();
  v_n int;
  v_st text;
BEGIN
  IF p_milestone_index < 0 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'bad_index');
  END IF;

  SELECT id, customer_id, dispute_open
  INTO b
  FROM public.bookings
  WHERE id = p_booking_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'booking_not_found');
  END IF;

  IF b.customer_id IS DISTINCT FROM p_customer_id THEN
    RETURN jsonb_build_object('ok', false, 'error', 'forbidden');
  END IF;

  IF b.dispute_open IS TRUE THEN
    RETURN jsonb_build_object('ok', false, 'error', 'dispute_open');
  END IF;

  SELECT * INTO v_row
  FROM public.booking_milestones
  WHERE booking_id = p_booking_id AND milestone_index = p_milestone_index
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'milestone_not_found');
  END IF;

  IF v_row.status IN ('confirmed', 'auto_confirmed') THEN
    RETURN jsonb_build_object('ok', true, 'idempotent', true, 'milestone_id', v_row.id);
  END IF;

  IF v_row.status IS DISTINCT FROM 'completed_pending_confirmation' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'bad_milestone_status');
  END IF;

  UPDATE public.booking_milestones
  SET
    status = 'confirmed',
    confirmed_at = v_now,
    confirmation_source = 'customer',
    payout_release_eligible_at = v_now,
    updated_at = v_now
  WHERE id = v_row.id AND status = 'completed_pending_confirmation';

  GET DIAGNOSTICS v_n = ROW_COUNT;
  IF v_n = 0 THEN
    SELECT status INTO v_st FROM public.booking_milestones WHERE id = v_row.id;
    IF v_st IN ('confirmed', 'auto_confirmed') THEN
      RETURN jsonb_build_object('ok', true, 'idempotent', true, 'milestone_id', v_row.id);
    END IF;
    RETURN jsonb_build_object('ok', false, 'error', 'concurrent_update');
  END IF;

  UPDATE public.bookings
  SET progress_status = 'milestone_confirmed'
  WHERE id = p_booking_id
    AND (
      progress_status IS NULL
      OR (
        progress_status IS DISTINCT FROM 'final_pending_confirmation'
        AND progress_status IS DISTINCT FROM 'completed'
      )
    );

  INSERT INTO public.booking_progress_events (booking_id, milestone_id, actor_user_id, event_type, event_payload)
  VALUES (
    p_booking_id,
    v_row.id,
    p_actor_user_id,
    'milestone_confirmed',
    jsonb_build_object('milestone_index', p_milestone_index)
  );

  RETURN jsonb_build_object('ok', true, 'milestone_id', v_row.id);
END;
$$;

REVOKE ALL ON FUNCTION public.booking_milestone_start_atomic(uuid, uuid, integer, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.booking_milestone_complete_atomic(uuid, uuid, integer, jsonb, text, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.booking_milestone_confirm_atomic(uuid, uuid, integer, uuid) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.booking_milestone_start_atomic(uuid, uuid, integer, uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.booking_milestone_complete_atomic(uuid, uuid, integer, jsonb, text, uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.booking_milestone_confirm_atomic(uuid, uuid, integer, uuid) TO service_role;
