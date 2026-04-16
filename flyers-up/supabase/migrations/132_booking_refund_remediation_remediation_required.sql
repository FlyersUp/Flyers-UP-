-- Allow remediation_required on append-only refund remediation ledger (pairs with booking_payment_events).

ALTER TABLE public.booking_refund_remediation_events
  DROP CONSTRAINT IF EXISTS booking_refund_remediation_events_event_type_check;

ALTER TABLE public.booking_refund_remediation_events
  ADD CONSTRAINT booking_refund_remediation_events_event_type_check CHECK (event_type IN (
    'remediation_session',
    'refund_requested',
    'refund_succeeded',
    'payout_already_sent',
    'clawback_required',
    'stripe_connect_recovery_pending',
    'stripe_connect_recovery_not_applicable',
    'clawback_resolved',
    'clawback_waived',
    'refund_batch_started',
    'refund_leg_succeeded',
    'refund_leg_failed',
    'refund_batch_partial_failure',
    'admin_review_required',
    'remediation_required',
    'remediation_resolved',
    'remediation_waived'
  ));
