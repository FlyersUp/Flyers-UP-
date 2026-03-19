-- ============================================
-- TRUST / DISPUTE CENTER (Customer-facing)
-- ============================================
-- Extends booking_issues into a full dispute workflow:
-- - richer issue types
-- - status tracking (submitted -> under_review -> waiting_for_pro -> resolved)
-- - requested resolution + resolved outcome
-- - evidence URLs
-- - support/customer/pro update thread
-- ============================================

-- 1) Expand booking_issues issue_type options
ALTER TABLE public.booking_issues
  DROP CONSTRAINT IF EXISTS booking_issues_issue_type_check;

ALTER TABLE public.booking_issues
  ADD CONSTRAINT booking_issues_issue_type_check
  CHECK (
    issue_type IN (
      'work_incomplete',
      'wrong_service',
      'pro_late',
      'damage_or_loss',
      'safety_concern',
      'billing_problem',
      'contact_support',
      'other'
    )
  );

-- 2) Add dispute workflow columns
ALTER TABLE public.booking_issues
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'submitted'
    CHECK (status IN ('submitted', 'under_review', 'waiting_for_pro', 'resolved')),
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS evidence_urls TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS requested_resolution TEXT
    CHECK (requested_resolution IS NULL OR requested_resolution IN ('refund', 'partial_refund', 'redo_service', 'other')),
  ADD COLUMN IF NOT EXISTS resolution_outcome TEXT
    CHECK (resolution_outcome IS NULL OR resolution_outcome IN ('refund', 'partial_refund', 'denied')),
  ADD COLUMN IF NOT EXISTS status_reason TEXT,
  ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

COMMENT ON COLUMN public.booking_issues.status IS 'Customer-facing dispute status';
COMMENT ON COLUMN public.booking_issues.description IS 'Detailed customer summary of what happened';
COMMENT ON COLUMN public.booking_issues.evidence_urls IS 'Public URLs to uploaded evidence';
COMMENT ON COLUMN public.booking_issues.requested_resolution IS 'Customer requested resolution';
COMMENT ON COLUMN public.booking_issues.resolution_outcome IS 'Final platform decision outcome';
COMMENT ON COLUMN public.booking_issues.status_reason IS 'Human-readable status update text';

CREATE INDEX IF NOT EXISTS idx_booking_issues_status ON public.booking_issues(status);
CREATE INDEX IF NOT EXISTS idx_booking_issues_user_created ON public.booking_issues(user_id, created_at DESC);

-- 3) Participants can view their own booking issues
DROP POLICY IF EXISTS "Participants view own booking issues" ON public.booking_issues;
CREATE POLICY "Participants view own booking issues"
  ON public.booking_issues FOR SELECT TO authenticated
  USING (
    booking_id IN (
      SELECT b.id FROM public.bookings b
      WHERE b.customer_id = auth.uid()
         OR b.pro_id IN (SELECT id FROM public.service_pros WHERE user_id = auth.uid())
    )
  );

-- 4) Reporter can append details/evidence (except final resolved metadata)
DROP POLICY IF EXISTS "Reporter updates own booking issues" ON public.booking_issues;
CREATE POLICY "Reporter updates own booking issues"
  ON public.booking_issues FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- 5) Support/customer/pro update thread for transparent dispute updates
CREATE TABLE IF NOT EXISTS public.booking_issue_updates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  issue_id UUID NOT NULL REFERENCES public.booking_issues(id) ON DELETE CASCADE,
  booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  author_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  author_role TEXT NOT NULL CHECK (author_role IN ('customer', 'pro', 'support', 'system')),
  message TEXT NOT NULL,
  attachment_urls TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_booking_issue_updates_issue ON public.booking_issue_updates(issue_id, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_booking_issue_updates_booking ON public.booking_issue_updates(booking_id, created_at ASC);

ALTER TABLE public.booking_issue_updates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Participants view booking issue updates" ON public.booking_issue_updates;
CREATE POLICY "Participants view booking issue updates"
  ON public.booking_issue_updates FOR SELECT TO authenticated
  USING (
    booking_id IN (
      SELECT b.id FROM public.bookings b
      WHERE b.customer_id = auth.uid()
         OR b.pro_id IN (SELECT id FROM public.service_pros WHERE user_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "Participants add booking issue updates" ON public.booking_issue_updates;
CREATE POLICY "Participants add booking issue updates"
  ON public.booking_issue_updates FOR INSERT TO authenticated
  WITH CHECK (
    author_user_id = auth.uid()
    AND booking_id IN (
      SELECT b.id FROM public.bookings b
      WHERE b.customer_id = auth.uid()
         OR b.pro_id IN (SELECT id FROM public.service_pros WHERE user_id = auth.uid())
    )
  );

