-- Post-payout refund remediation: append-only operational events + denormalized status for admin queues.
-- Stripe Connect: customer refunds debit the platform; outbound Transfers to the connected account are not auto-reversed.

ALTER TABLE public.payout_review_queue DROP CONSTRAINT IF EXISTS payout_review_queue_reason_check;

ALTER TABLE public.payout_review_queue
  ADD CONSTRAINT payout_review_queue_reason_check CHECK (reason IN (
    'suspicious_completion',
    'missing_evidence',
    'low_arrival_confidence',
    'repeated_disputes',
    'repeated_no_shows',
    'low_reliability',
    'dispute_open',
    'refund_pending',
    'payout_blocked',
    'stripe_not_ready',
    'pro_payout_hold',
    'post_payout_customer_refund'
  ));

COMMENT ON COLUMN public.payout_review_queue.reason IS
  'Includes post_payout_customer_refund when a refund ran after payout_released (clawback / recovery review).';

ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS pro_clawback_remediation_status text NOT NULL DEFAULT 'none'
    CHECK (pro_clawback_remediation_status IN ('none', 'open', 'resolved', 'waived'));

ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS stripe_outbound_recovery_status text NOT NULL DEFAULT 'not_applicable'
    CHECK (stripe_outbound_recovery_status IN (
      'not_applicable',
      'pending_review',
      'reversal_recorded',
      'waived',
      'resolved_offline'
    ));

COMMENT ON COLUMN public.bookings.pro_clawback_remediation_status IS
  'Pro-side balance recovery after customer refund post–payout release: none | open (needs ops) | resolved | waived.';

COMMENT ON COLUMN public.bookings.stripe_outbound_recovery_status IS
  'Whether/how Stripe Connect outbound transfer recovery is tracked: not_applicable (no transfer), pending_review, reversal_recorded, waived, resolved_offline.';

CREATE INDEX IF NOT EXISTS idx_bookings_pro_clawback_open
  ON public.bookings (pro_clawback_remediation_status)
  WHERE pro_clawback_remediation_status = 'open';

CREATE TABLE IF NOT EXISTS public.booking_refund_remediation_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  event_type text NOT NULL,
  details jsonb NOT NULL DEFAULT '{}',
  actor_type text NOT NULL DEFAULT 'system' CHECK (actor_type IN ('system', 'admin', 'cron')),
  actor_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  idempotency_key text,
  CONSTRAINT booking_refund_remediation_events_event_type_check CHECK (event_type IN (
    'remediation_session',
    'refund_requested',
    'refund_succeeded',
    'payout_already_sent',
    'clawback_required',
    'stripe_connect_recovery_pending',
    'stripe_connect_recovery_not_applicable',
    'clawback_resolved',
    'clawback_waived'
  ))
);

CREATE UNIQUE INDEX IF NOT EXISTS booking_refund_remediation_events_idempotency_uq
  ON public.booking_refund_remediation_events (booking_id, idempotency_key)
  WHERE idempotency_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_booking_refund_remediation_events_booking_created
  ON public.booking_refund_remediation_events (booking_id, created_at DESC);

COMMENT ON TABLE public.booking_refund_remediation_events IS
  'Append-only operational log for post-payout refunds: clawback, Connect recovery, admin resolution.';

ALTER TABLE public.booking_refund_remediation_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Participants select booking_refund_remediation_events" ON public.booking_refund_remediation_events;
CREATE POLICY "Participants select booking_refund_remediation_events"
  ON public.booking_refund_remediation_events FOR SELECT TO authenticated
  USING (
    booking_id IN (
      SELECT b.id FROM public.bookings b
      WHERE b.customer_id = auth.uid()
         OR b.pro_id IN (SELECT id FROM public.service_pros WHERE user_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "Admins select booking_refund_remediation_events" ON public.booking_refund_remediation_events;
CREATE POLICY "Admins select booking_refund_remediation_events"
  ON public.booking_refund_remediation_events FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));
