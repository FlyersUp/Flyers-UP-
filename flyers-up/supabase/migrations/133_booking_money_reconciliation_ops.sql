-- Lightweight admin queue metadata for money reconciliation (owner, review stamp, note).
-- Accessed only via service-role server routes (RLS enabled, no broad policies).

CREATE TABLE IF NOT EXISTS public.booking_money_reconciliation_ops (
  booking_id uuid NOT NULL PRIMARY KEY REFERENCES public.bookings (id) ON DELETE CASCADE,
  assigned_to uuid NULL REFERENCES auth.users (id) ON DELETE SET NULL,
  last_reviewed_at timestamptz NULL,
  ops_note text NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_booking_money_reconciliation_ops_assigned
  ON public.booking_money_reconciliation_ops (assigned_to)
  WHERE assigned_to IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_booking_money_reconciliation_ops_last_reviewed
  ON public.booking_money_reconciliation_ops (last_reviewed_at DESC NULLS LAST);

COMMENT ON TABLE public.booking_money_reconciliation_ops IS
  'Admin case metadata for /admin/reconciliation: assignee, last review time, short ops note.';

ALTER TABLE public.booking_money_reconciliation_ops ENABLE ROW LEVEL SECURITY;
