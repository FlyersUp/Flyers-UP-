-- Track last support-inbox email notification attempt (additive; admin/debug visibility)

ALTER TABLE public.support_tickets
  ADD COLUMN IF NOT EXISTS inbox_email_notify_status TEXT,
  ADD COLUMN IF NOT EXISTS inbox_email_notify_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS inbox_email_notify_detail TEXT;

COMMENT ON COLUMN public.support_tickets.inbox_email_notify_status IS
  'sent | skipped_notifications_disabled | skipped_resend_not_configured | failed (set after POST /api/support/tickets runs notify step)';
COMMENT ON COLUMN public.support_tickets.inbox_email_notify_at IS 'When the notification step last completed (any outcome)';
COMMENT ON COLUMN public.support_tickets.inbox_email_notify_detail IS 'Optional: Resend error, skip reason, or short debug note';
