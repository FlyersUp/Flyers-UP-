-- ============================================
-- STRIPE DISPUTES TRACKING
-- ============================================
-- Tracks Stripe disputes/chargebacks for payout risk.
-- Webhook charge.dispute.created inserts; charge.dispute.closed marks resolved.
-- evaluatePayoutRiskForPro checks for active disputes to hold payouts.
-- Safe to re-run (idempotent).

CREATE TABLE IF NOT EXISTS public.stripe_disputes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stripe_dispute_id TEXT NOT NULL UNIQUE,
  booking_id UUID REFERENCES public.bookings(id) ON DELETE SET NULL,
  pro_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'open',
  amount_cents INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_stripe_disputes_pro_user ON public.stripe_disputes(pro_user_id);
CREATE INDEX IF NOT EXISTS idx_stripe_disputes_status ON public.stripe_disputes(pro_user_id, status) WHERE status = 'open';
CREATE INDEX IF NOT EXISTS idx_stripe_disputes_booking ON public.stripe_disputes(booking_id);

COMMENT ON TABLE public.stripe_disputes IS 'Stripe dispute/chargeback events for payout risk. Open disputes trigger payouts_on_hold.';

ALTER TABLE public.stripe_disputes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view disputes" ON public.stripe_disputes;
CREATE POLICY "Admins can view disputes"
  ON public.stripe_disputes FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

DROP POLICY IF EXISTS "Service role can manage disputes" ON public.stripe_disputes;
CREATE POLICY "Service role can manage disputes"
  ON public.stripe_disputes FOR ALL TO service_role
  USING (true) WITH CHECK (true);
