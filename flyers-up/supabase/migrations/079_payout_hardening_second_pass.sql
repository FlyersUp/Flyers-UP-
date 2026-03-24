-- ============================================
-- PAYOUT HARDENING SECOND PASS
-- ============================================
-- Anti-fake-completion guards, booking_payouts, manual review queue.
-- ============================================

-- 1. BOOKINGS: suspicious completion + evidence fields
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS suspicious_completion BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS suspicious_completion_reason TEXT,
  ADD COLUMN IF NOT EXISTS minimum_expected_duration_minutes INTEGER,
  ADD COLUMN IF NOT EXISTS evidence_requirement_level TEXT;

COMMENT ON COLUMN public.bookings.suspicious_completion IS 'True when start->complete duration is unrealistically short; blocks auto-confirm payout';
COMMENT ON COLUMN public.bookings.suspicious_completion_reason IS 'Reason: too_fast, missing_evidence, low_arrival_confidence';
COMMENT ON COLUMN public.bookings.minimum_expected_duration_minutes IS 'Category-derived min duration; used for suspicious check';
COMMENT ON COLUMN public.bookings.evidence_requirement_level IS 'physical, standard, virtual';

-- 2. service_categories: payout/evidence rules
ALTER TABLE public.service_categories
  ADD COLUMN IF NOT EXISTS evidence_requirement_level TEXT DEFAULT 'standard',
  ADD COLUMN IF NOT EXISTS minimum_duration_minutes INTEGER DEFAULT 30,
  ADD COLUMN IF NOT EXISTS requires_before_after_photos BOOLEAN DEFAULT false;

COMMENT ON COLUMN public.service_categories.evidence_requirement_level IS 'physical=before+after photos; standard=arrival+duration; virtual=session+notes';
COMMENT ON COLUMN public.service_categories.minimum_duration_minutes IS 'Minimum expected start->complete duration for this category';
COMMENT ON COLUMN public.service_categories.requires_before_after_photos IS 'True for cleaning, painting, junk removal, moving';

-- 3. booking_payouts: idempotent payout records (one per booking)
CREATE TABLE IF NOT EXISTS public.booking_payouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE UNIQUE,
  stripe_transfer_id TEXT UNIQUE,
  amount_cents INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'usd',
  status TEXT NOT NULL DEFAULT 'eligible' CHECK (status IN ('eligible', 'queued', 'released', 'failed', 'reversed')),
  idempotency_key TEXT UNIQUE,
  payout_block_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_booking_payouts_booking ON public.booking_payouts(booking_id);
CREATE INDEX IF NOT EXISTS idx_booking_payouts_status ON public.booking_payouts(status) WHERE status IN ('eligible', 'queued');
CREATE INDEX IF NOT EXISTS idx_booking_payouts_transfer ON public.booking_payouts(stripe_transfer_id) WHERE stripe_transfer_id IS NOT NULL;

ALTER TABLE public.booking_payouts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Service role manages booking_payouts" ON public.booking_payouts;
CREATE POLICY "Service role manages booking_payouts"
  ON public.booking_payouts FOR ALL TO service_role USING (true) WITH CHECK (true);

-- 4. payout_review_queue: manual review path
CREATE TABLE IF NOT EXISTS public.payout_review_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE UNIQUE,
  reason TEXT NOT NULL CHECK (reason IN (
    'suspicious_completion', 'missing_evidence', 'low_arrival_confidence',
    'repeated_disputes', 'repeated_no_shows', 'low_reliability'
  )),
  details JSONB DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_payout_review_queue_status ON public.payout_review_queue(status) WHERE status = 'pending';

ALTER TABLE public.payout_review_queue ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins manage payout review queue" ON public.payout_review_queue;
CREATE POLICY "Admins manage payout review queue"
  ON public.payout_review_queue FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));

-- 5. Backfill evidence rules for physical categories (cleaning, painting, moving, junk, landscaping)
UPDATE public.service_categories
SET
  evidence_requirement_level = 'physical',
  minimum_duration_minutes = 60,
  requires_before_after_photos = true
WHERE slug IN ('cleaning', 'cleaning-services', 'move-help', 'painting', 'moving', 'junk-removal', 'landscaping', 'lawn-care', 'pet-care', 'handyman', 'photography');
