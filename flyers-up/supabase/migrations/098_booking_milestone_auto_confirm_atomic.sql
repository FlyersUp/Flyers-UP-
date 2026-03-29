-- Atomic milestone auto-confirm (cron): single transaction, row locks. Service role only.

CREATE OR REPLACE FUNCTION public.booking_milestone_auto_confirm_atomic(
  p_booking_id uuid,
  p_milestone_index integer
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

  SELECT id, dispute_open
  INTO b
  FROM public.bookings
  WHERE id = p_booking_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'booking_not_found');
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

  IF v_row.dispute_open IS TRUE THEN
    RETURN jsonb_build_object('ok', false, 'error', 'milestone_dispute');
  END IF;

  IF v_row.status IS DISTINCT FROM 'completed_pending_confirmation' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'bad_milestone_status');
  END IF;

  IF v_row.confirmation_due_at IS NULL OR v_row.confirmation_due_at >= v_now THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_due_yet');
  END IF;

  UPDATE public.booking_milestones
  SET
    status = 'auto_confirmed',
    confirmed_at = v_now,
    confirmation_source = 'auto',
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
    NULL,
    'milestone_auto_confirmed',
    jsonb_build_object('milestone_index', p_milestone_index)
  );

  RETURN jsonb_build_object('ok', true, 'milestone_id', v_row.id);
END;
$$;

REVOKE ALL ON FUNCTION public.booking_milestone_auto_confirm_atomic(uuid, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.booking_milestone_auto_confirm_atomic(uuid, integer) TO service_role;
