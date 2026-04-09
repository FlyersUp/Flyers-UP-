-- Trust & safety: append-only audit log (admin-readable), optional support ticket attachments bucket

-- ---- trust_safety_audit_log ----
CREATE TABLE IF NOT EXISTS public.trust_safety_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  resource_type TEXT NOT NULL CHECK (resource_type IN ('support_ticket', 'user_report')),
  resource_id UUID NOT NULL,
  action TEXT NOT NULL,
  actor_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  details JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_trust_safety_audit_resource
  ON public.trust_safety_audit_log(resource_type, resource_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_trust_safety_audit_created
  ON public.trust_safety_audit_log(created_at DESC);

COMMENT ON TABLE public.trust_safety_audit_log IS 'Append-only audit trail for support tickets and user reports; admin visibility only.';

ALTER TABLE public.trust_safety_audit_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins select trust_safety_audit_log" ON public.trust_safety_audit_log;
CREATE POLICY "Admins select trust_safety_audit_log"
  ON public.trust_safety_audit_log FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

-- Inserts are performed with service role (bypasses RLS). No INSERT policy for authenticated users.

-- ---- support_tickets: attachment paths (Storage object paths under support_attachments bucket) ----
ALTER TABLE public.support_tickets
  ADD COLUMN IF NOT EXISTS attachment_storage_paths TEXT[] NOT NULL DEFAULT '{}'::text[];

COMMENT ON COLUMN public.support_tickets.attachment_storage_paths IS 'Private storage paths: {user_id}/{ticket_id}/{filename}; populated after ticket creation.';

-- ---- Storage: support_attachments (private) ----
INSERT INTO storage.buckets (id, name, public)
VALUES ('support_attachments', 'support_attachments', false)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Users upload own support attachments" ON storage.objects;
CREATE POLICY "Users upload own support attachments"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'support_attachments'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "Users read own support attachments" ON storage.objects;
CREATE POLICY "Users read own support attachments"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'support_attachments'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "Users update own support attachments" ON storage.objects;
CREATE POLICY "Users update own support attachments"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'support_attachments'
    AND (storage.foldername(name))[1] = auth.uid()::text
  )
  WITH CHECK (
    bucket_id = 'support_attachments'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "Users delete own support attachments" ON storage.objects;
CREATE POLICY "Users delete own support attachments"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'support_attachments'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
