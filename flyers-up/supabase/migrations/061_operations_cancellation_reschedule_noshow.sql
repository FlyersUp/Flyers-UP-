-- ============================================
-- OPERATIONS: Cancellation, Reschedule, No-Show
-- ============================================
-- 1. Cancellation + Refund Policy Engine fields
-- 2. Reschedule request system
-- 3. No-show / lateness evidence fields
-- ============================================

-- ============================================
-- 1. CANCELLATION + REFUND POLICY (bookings)
-- ============================================
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS cancellation_policy_version TEXT,
  ADD COLUMN IF NOT EXISTS cancellation_reason_code TEXT,
  ADD COLUMN IF NOT EXISTS canceled_by_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS canceled_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS refund_type TEXT CHECK (refund_type IS NULL OR refund_type IN ('full', 'partial', 'none', 'admin_override')),
  ADD COLUMN IF NOT EXISTS refund_amount_cents INTEGER,
  ADD COLUMN IF NOT EXISTS policy_decision_snapshot JSONB,
  ADD COLUMN IF NOT EXISTS policy_explanation TEXT,
  ADD COLUMN IF NOT EXISTS strike_applied BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS manual_review_required BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN public.bookings.cancellation_policy_version IS 'Policy version at time of cancellation';
COMMENT ON COLUMN public.bookings.cancellation_reason_code IS 'Typed reason: customer_change_plans, pro_unavailable, no_show_customer, no_show_pro, late_pro, late_customer, admin, system_expired, other';
COMMENT ON COLUMN public.bookings.refund_type IS 'full | partial | none | admin_override';
COMMENT ON COLUMN public.bookings.policy_decision_snapshot IS 'Full rule snapshot for admin audit';
COMMENT ON COLUMN public.bookings.policy_explanation IS 'Human-readable explanation';
COMMENT ON COLUMN public.bookings.strike_applied IS 'Pro reliability strike applied';
COMMENT ON COLUMN public.bookings.manual_review_required IS 'Policy flagged for admin review';

CREATE INDEX IF NOT EXISTS idx_bookings_canceled_at ON public.bookings(canceled_at) WHERE canceled_at IS NOT NULL;

-- ============================================
-- 2. RESCHEDULE REQUESTS
-- ============================================
CREATE TABLE IF NOT EXISTS public.reschedule_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  requested_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  requested_by_role TEXT NOT NULL CHECK (requested_by_role IN ('customer', 'pro')),
  proposed_service_date DATE NOT NULL,
  proposed_service_time TEXT NOT NULL,
  proposed_start_at TIMESTAMPTZ,
  reason_code TEXT CHECK (reason_code IN ('customer_schedule', 'pro_schedule', 'weather', 'emergency', 'other')),
  message TEXT,
  reschedule_count INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'expired')),
  responded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  responded_at TIMESTAMPTZ,
  response_note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_reschedule_requests_booking ON public.reschedule_requests(booking_id);
CREATE INDEX IF NOT EXISTS idx_reschedule_requests_status ON public.reschedule_requests(status);

ALTER TABLE public.reschedule_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Participants view reschedule requests" ON public.reschedule_requests;
CREATE POLICY "Participants view reschedule requests"
  ON public.reschedule_requests FOR SELECT TO authenticated
  USING (
    booking_id IN (
      SELECT b.id FROM public.bookings b
      WHERE b.customer_id = auth.uid()
         OR b.pro_id IN (SELECT id FROM public.service_pros WHERE user_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "Participants create reschedule requests" ON public.reschedule_requests;
CREATE POLICY "Participants create reschedule requests"
  ON public.reschedule_requests FOR INSERT TO authenticated
  WITH CHECK (
    requested_by = auth.uid()
    AND booking_id IN (
      SELECT b.id FROM public.bookings b
      WHERE b.customer_id = auth.uid()
         OR b.pro_id IN (SELECT id FROM public.service_pros WHERE user_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "Participants update reschedule requests" ON public.reschedule_requests;
CREATE POLICY "Participants update reschedule requests"
  ON public.reschedule_requests FOR UPDATE TO authenticated
  USING (
    booking_id IN (
      SELECT b.id FROM public.bookings b
      WHERE b.customer_id = auth.uid()
         OR b.pro_id IN (SELECT id FROM public.service_pros WHERE user_id = auth.uid())
    )
  );

-- Bookings: reschedule audit fields
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS original_service_date DATE,
  ADD COLUMN IF NOT EXISTS original_service_time TEXT,
  ADD COLUMN IF NOT EXISTS reschedule_count INTEGER NOT NULL DEFAULT 0;

COMMENT ON COLUMN public.bookings.original_service_date IS 'First scheduled date before any reschedule';
COMMENT ON COLUMN public.bookings.original_service_time IS 'First scheduled time before any reschedule';

-- ============================================
-- 3. NO-SHOW / LATENESS (bookings + evidence)
-- ============================================
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS arrival_started_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS arrival_verified_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS late_status TEXT CHECK (late_status IS NULL OR late_status IN ('none', 'pro_late', 'customer_late', 'both', 'disputed')),
  ADD COLUMN IF NOT EXISTS no_show_status TEXT CHECK (no_show_status IS NULL OR no_show_status IN ('none', 'customer_no_show', 'pro_no_show', 'disputed')),
  ADD COLUMN IF NOT EXISTS wait_timer_started_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS wait_timer_expires_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS evidence_bundle_id UUID;

COMMENT ON COLUMN public.bookings.arrival_started_at IS 'When pro began arrival check-in flow';
COMMENT ON COLUMN public.bookings.arrival_verified_at IS 'When GPS arrival verified';
COMMENT ON COLUMN public.bookings.late_status IS 'none | pro_late | customer_late | both | disputed';
COMMENT ON COLUMN public.bookings.no_show_status IS 'none | customer_no_show | pro_no_show | disputed';
COMMENT ON COLUMN public.bookings.wait_timer_started_at IS 'When grace-period timer started (10-15 min)';
COMMENT ON COLUMN public.bookings.wait_timer_expires_at IS 'When grace period expires';

-- Evidence bundles: structured audit for disputes (create before FK from bookings)
CREATE TABLE IF NOT EXISTS public.evidence_bundles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  bundle_type TEXT NOT NULL DEFAULT 'dispute' CHECK (bundle_type IN ('arrival', 'no_show', 'lateness', 'dispute', 'cancellation')),
  gps_arrival_lat DOUBLE PRECISION,
  gps_arrival_lng DOUBLE PRECISION,
  gps_arrival_at TIMESTAMPTZ,
  chat_attempts JSONB NOT NULL DEFAULT '[]'::jsonb,
  call_attempts JSONB NOT NULL DEFAULT '[]'::jsonb,
  photo_urls TEXT[] NOT NULL DEFAULT '{}',
  status_changes JSONB NOT NULL DEFAULT '[]'::jsonb,
  completeness_score INTEGER CHECK (completeness_score >= 0 AND completeness_score <= 100),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_evidence_bundles_booking ON public.evidence_bundles(booking_id);

ALTER TABLE public.evidence_bundles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Participants view evidence bundles" ON public.evidence_bundles;
CREATE POLICY "Participants view evidence bundles"
  ON public.evidence_bundles FOR SELECT TO authenticated
  USING (
    booking_id IN (
      SELECT b.id FROM public.bookings b
      WHERE b.customer_id = auth.uid()
         OR b.pro_id IN (SELECT id FROM public.service_pros WHERE user_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "System inserts evidence bundles" ON public.evidence_bundles;
-- Service role / admin only for insert/update

-- FK from bookings to evidence_bundle
ALTER TABLE public.bookings DROP CONSTRAINT IF EXISTS fk_bookings_evidence_bundle;
ALTER TABLE public.bookings
  ADD CONSTRAINT fk_bookings_evidence_bundle
  FOREIGN KEY (evidence_bundle_id) REFERENCES public.evidence_bundles(id) ON DELETE SET NULL;

-- Contact attempt log (for no-show evidence)
CREATE TABLE IF NOT EXISTS public.contact_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  initiated_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  attempt_type TEXT NOT NULL CHECK (attempt_type IN ('in_app_message', 'call')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_contact_attempts_booking ON public.contact_attempts(booking_id);

ALTER TABLE public.contact_attempts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Participants insert contact attempts" ON public.contact_attempts;
CREATE POLICY "Participants insert contact attempts"
  ON public.contact_attempts FOR INSERT TO authenticated
  WITH CHECK (
    initiated_by = auth.uid()
    AND booking_id IN (
      SELECT b.id FROM public.bookings b
      WHERE b.customer_id = auth.uid()
         OR b.pro_id IN (SELECT id FROM public.service_pros WHERE user_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "Participants view contact attempts" ON public.contact_attempts;
CREATE POLICY "Participants view contact attempts"
  ON public.contact_attempts FOR SELECT TO authenticated
  USING (
    booking_id IN (
      SELECT b.id FROM public.bookings b
      WHERE b.customer_id = auth.uid()
         OR b.pro_id IN (SELECT id FROM public.service_pros WHERE user_id = auth.uid())
    )
  );

-- Disputes table for admin
CREATE TABLE IF NOT EXISTS public.booking_disputes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE UNIQUE,
  dispute_reason_code TEXT CHECK (dispute_reason_code IN ('refund', 'no_show', 'lateness', 'work_quality', 'scope_mismatch', 'payment', 'other')),
  customer_claim TEXT,
  pro_claim TEXT,
  risk_flags TEXT[] DEFAULT '{}',
  admin_decision TEXT CHECK (admin_decision IS NULL OR admin_decision IN ('uphold_customer', 'uphold_pro', 'split_refund', 'pending', 'request_evidence')),
  admin_notes TEXT,
  admin_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_booking_disputes_booking ON public.booking_disputes(booking_id);

ALTER TABLE public.booking_disputes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins manage disputes" ON public.booking_disputes;
CREATE POLICY "Admins manage disputes"
  ON public.booking_disputes FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));

DROP POLICY IF EXISTS "Participants view own disputes" ON public.booking_disputes;
CREATE POLICY "Participants view own disputes"
  ON public.booking_disputes FOR SELECT TO authenticated
  USING (
    booking_id IN (
      SELECT b.id FROM public.bookings b
      WHERE b.customer_id = auth.uid()
         OR b.pro_id IN (SELECT id FROM public.service_pros WHERE user_id = auth.uid())
    )
  );
