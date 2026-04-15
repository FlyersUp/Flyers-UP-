-- Append-only refund ledger + explicit post-payout refund flag (Stripe Connect: PI refunds do not reverse outbound Transfers).

ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS refund_after_payout boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.bookings.refund_after_payout IS 'True if any customer refund occurred while payout_released was true (or ledger says after_payout). Connect: funds the customer from platform balance; pro transfer is not auto-reversed.';

CREATE TABLE IF NOT EXISTS public.booking_refund_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  refund_type text NOT NULL,
  stripe_refund_id text,
  stripe_charge_id text,
  payment_intent_id text,
  amount_cents integer NOT NULL,
  requires_clawback boolean NOT NULL DEFAULT false,
  stripe_event_id text,
  source text NOT NULL DEFAULT 'system',
  CONSTRAINT booking_refund_events_refund_type_check
    CHECK (refund_type IN ('before_payout', 'after_payout'))
);

CREATE UNIQUE INDEX IF NOT EXISTS booking_refund_events_stripe_event_id_key
  ON public.booking_refund_events (stripe_event_id)
  WHERE stripe_event_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_booking_refund_events_booking_created
  ON public.booking_refund_events (booking_id, created_at DESC);

COMMENT ON TABLE public.booking_refund_events IS 'Append-only Stripe refund applications per booking; idempotent on stripe_event_id for webhooks.';
COMMENT ON COLUMN public.booking_refund_events.requires_clawback IS 'True when refund_type=after_payout: platform may need to recover funds from pro (Stripe does not reverse Transfer automatically).';
COMMENT ON COLUMN public.booking_refund_events.source IS 'webhook | admin | cron | dispute | system';

ALTER TABLE public.booking_refund_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Participants select booking_refund_events" ON public.booking_refund_events;
CREATE POLICY "Participants select booking_refund_events"
  ON public.booking_refund_events FOR SELECT TO authenticated
  USING (
    booking_id IN (
      SELECT b.id FROM public.bookings b
      WHERE b.customer_id = auth.uid()
         OR b.pro_id IN (SELECT id FROM public.service_pros WHERE user_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "Admins select booking_refund_events" ON public.booking_refund_events;
CREATE POLICY "Admins select booking_refund_events"
  ON public.booking_refund_events FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));
