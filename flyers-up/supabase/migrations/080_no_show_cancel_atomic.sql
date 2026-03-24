-- ============================================
-- TRANSACTION-SAFE NO-SHOW CANCEL
-- ============================================
-- Single atomic RPC: lock row, re-check all conditions, update + incident + event.
-- Route calls this then does refund + notifications (side effects).
-- ============================================

CREATE OR REPLACE FUNCTION public.cancel_booking_no_show_pro_atomic(
  p_booking_id UUID,
  p_customer_id UUID,
  p_now TIMESTAMPTZ DEFAULT now()
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row RECORD;
  v_no_show_eligible_at TIMESTAMPTZ;
  v_history JSONB;
  v_new_history JSONB;
BEGIN
  -- 1. Lock and fetch the booking
  SELECT
    id, customer_id, pro_id, status, arrived_at, completed_at, cancelled_at,
    COALESCE(b.payout_released, false) AS payout_released,
    scheduled_start_at, grace_period_minutes, no_show_eligible_at,
    stripe_payment_intent_deposit_id, refund_status, status_history,
    (SELECT EXISTS (SELECT 1 FROM booking_payouts bp WHERE bp.booking_id = b.id AND bp.stripe_transfer_id IS NOT NULL)) AS has_payout_transfer
  INTO v_row
  FROM bookings b
  WHERE id = p_booking_id
    AND customer_id = p_customer_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'not_found');
  END IF;

  -- 2. Re-check status
  IF v_row.status NOT IN (
    'requested', 'accepted', 'payment_required', 'deposit_due', 'deposit_paid',
    'awaiting_deposit_payment', 'awaiting_pro_arrival', 'pro_en_route', 'on_the_way'
  ) THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'invalid_status', 'status', v_row.status);
  END IF;

  -- 3. Re-check arrived_at
  IF v_row.arrived_at IS NOT NULL THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'pro_arrived');
  END IF;

  -- 4. Re-check completed_at
  IF v_row.completed_at IS NOT NULL THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'already_completed');
  END IF;

  -- 5. Re-check cancelled_at
  IF v_row.cancelled_at IS NOT NULL THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'already_cancelled');
  END IF;

  -- 6. Re-check payout (booking flag or transfer record)
  IF v_row.payout_released OR v_row.has_payout_transfer THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'payout_already_released');
  END IF;

  -- 7. Re-check threshold time
  v_no_show_eligible_at := v_row.no_show_eligible_at;
  IF v_no_show_eligible_at IS NULL AND v_row.scheduled_start_at IS NOT NULL THEN
    v_no_show_eligible_at := v_row.scheduled_start_at
      + (COALESCE(v_row.grace_period_minutes, 60) || ' minutes')::interval;
  END IF;
  IF v_no_show_eligible_at IS NULL OR p_now < v_no_show_eligible_at THEN
    RETURN jsonb_build_object(
      'ok', false, 'reason', 'threshold_not_reached',
      'no_show_eligible_at', v_no_show_eligible_at
    );
  END IF;

  -- 8. Update booking (atomic with lock)
  v_history := COALESCE(v_row.status_history, '[]'::jsonb);
  v_new_history := v_history || jsonb_build_array(
    jsonb_build_object('status', 'canceled_no_show_pro', 'at', p_now::text)
  );

  UPDATE bookings
  SET
    status = 'canceled_no_show_pro',
    cancelled_at = p_now,
    canceled_by = 'customer',
    cancellation_reason = 'pro_no_show',
    status_history = v_new_history
  WHERE id = p_booking_id;

  -- 9. Insert incident (pro reliability)
  INSERT INTO pro_booking_incidents (pro_id, booking_id, incident_type, incident_points, notes, expires_at)
  VALUES (
    v_row.pro_id,
    p_booking_id,
    'no_show',
    1,
    'Customer canceled due to pro no-show (penalty-free)',
    p_now + interval '90 days'
  );

  -- 10. Insert event
  INSERT INTO booking_events (booking_id, type, data)
  VALUES (
    p_booking_id,
    'CANCELED_NO_SHOW_PRO',
    jsonb_build_object('canceled_by', 'customer', 'cancellation_reason', 'pro_no_show')
  );

  RETURN jsonb_build_object(
    'ok', true,
    'pro_id', v_row.pro_id,
    'stripe_payment_intent_deposit_id', v_row.stripe_payment_intent_deposit_id,
    'refund_status', v_row.refund_status
  );
END;
$$;

COMMENT ON FUNCTION public.cancel_booking_no_show_pro_atomic IS 'Atomic no-show cancel: lock, re-check, update, incident, event. Returns ok/reason. Caller handles refund + notifications.';

GRANT EXECUTE ON FUNCTION public.cancel_booking_no_show_pro_atomic TO service_role;
GRANT EXECUTE ON FUNCTION public.cancel_booking_no_show_pro_atomic TO authenticated;
