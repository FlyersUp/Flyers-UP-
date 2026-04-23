-- messaging_trust_signals: strip PostgREST JWT roles from the table (defense in depth).
-- RLS remains enabled with no policies for anon/authenticated; revokes ensure the Data API
-- cannot reference this relation even if grants drift. Inserts use service_role in API routes.

ALTER TABLE public.messaging_trust_signals ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.messaging_trust_signals FROM anon, authenticated;
GRANT ALL ON TABLE public.messaging_trust_signals TO service_role;
