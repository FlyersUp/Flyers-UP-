-- Trust & safety: allow booking-scoped audit rows (e.g. blocked messaging attempts on a booking thread)

ALTER TABLE public.trust_safety_audit_log
  DROP CONSTRAINT IF EXISTS trust_safety_audit_log_resource_type_check;

ALTER TABLE public.trust_safety_audit_log
  ADD CONSTRAINT trust_safety_audit_log_resource_type_check
  CHECK (resource_type IN ('support_ticket', 'user_report', 'booking'));

COMMENT ON TABLE public.trust_safety_audit_log IS
  'Append-only audit trail for support tickets, user reports, and booking-scoped safety events; admin visibility only.';
