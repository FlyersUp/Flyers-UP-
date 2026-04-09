-- Support tickets: category, optional subject line, admin workflow
-- User reports: moderation workflow + notes
-- Additive, idempotent where possible

-- ---- support_tickets ----
ALTER TABLE public.support_tickets
  ADD COLUMN IF NOT EXISTS category TEXT NOT NULL DEFAULT 'other',
  ADD COLUMN IF NOT EXISTS internal_notes TEXT,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

ALTER TABLE public.support_tickets
  ALTER COLUMN subject DROP NOT NULL;

ALTER TABLE public.support_tickets
  DROP CONSTRAINT IF EXISTS support_tickets_status_check;

ALTER TABLE public.support_tickets
  ADD CONSTRAINT support_tickets_status_check
  CHECK (status IN ('open', 'in_progress', 'resolved'));

COMMENT ON COLUMN public.support_tickets.category IS 'account | payments | booking_issue | pro_issue | customer_issue | technical_bug | safety | other';
COMMENT ON COLUMN public.support_tickets.internal_notes IS 'Admin-only notes (not visible to user)';

CREATE INDEX IF NOT EXISTS idx_support_tickets_status ON public.support_tickets(status);
CREATE INDEX IF NOT EXISTS idx_support_tickets_category ON public.support_tickets(category);

-- ---- user_reports ----
ALTER TABLE public.user_reports
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS admin_notes TEXT,
  ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

ALTER TABLE public.user_reports
  DROP CONSTRAINT IF EXISTS user_reports_status_check;

ALTER TABLE public.user_reports
  ADD CONSTRAINT user_reports_status_check
  CHECK (status IN ('pending', 'reviewed', 'escalated', 'dismissed'));

COMMENT ON COLUMN public.user_reports.status IS 'pending | reviewed | escalated | dismissed';
COMMENT ON COLUMN public.user_reports.admin_notes IS 'Internal moderation notes';

CREATE INDEX IF NOT EXISTS idx_user_reports_status ON public.user_reports(status);
