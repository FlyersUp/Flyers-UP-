-- Soft-trust signals from booking chat (off-platform solicitation heuristics) for admin review.
-- No message body stored — fingerprint is SHA256 prefix of normalized text for dedupe/trending only.

CREATE TABLE IF NOT EXISTS public.messaging_trust_signals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES public.bookings (id) ON DELETE CASCADE,
  actor_user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  signal_category text NOT NULL,
  intervention_kind text NOT NULL DEFAULT 'inline_reminder',
  message_fingerprint text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_messaging_trust_signals_booking
  ON public.messaging_trust_signals (booking_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_messaging_trust_signals_created
  ON public.messaging_trust_signals (created_at DESC);

COMMENT ON TABLE public.messaging_trust_signals IS 'Heuristic flags from booking-thread messages; admin/trust tooling — not for automated blocking.';

-- Placeholder loyalty / repeat perks (no pricing side effects until product enables them).
CREATE TABLE IF NOT EXISTS public.customer_loyalty_hooks (
  user_id uuid PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  repeat_visit_count integer NOT NULL DEFAULT 0,
  loyalty_tier_placeholder text NOT NULL DEFAULT 'standard',
  discounted_rebooking_fee_eligible boolean NOT NULL DEFAULT false,
  priority_support_placeholder boolean NOT NULL DEFAULT false,
  repeat_customer_badge_placeholder boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.customer_loyalty_hooks IS 'Future repeat-customer perks; UI placeholders only — do not drive fee calculations yet.';

ALTER TABLE public.customer_loyalty_hooks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users read own loyalty hooks" ON public.customer_loyalty_hooks;
CREATE POLICY "Users read own loyalty hooks"
  ON public.customer_loyalty_hooks
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);
