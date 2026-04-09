import { createAdminSupabaseClient } from '@/lib/supabaseServer';

type Row = {
  id: string;
  created_at: string;
  action: string;
  actor_user_id: string | null;
  details: Record<string, unknown> | null;
};

export async function TrustSafetyAuditTrail({
  resourceType,
  resourceId,
}: {
  resourceType: 'support_ticket' | 'user_report';
  resourceId: string;
}) {
  const admin = createAdminSupabaseClient();
  const { data, error } = await admin
    .from('trust_safety_audit_log')
    .select('id, created_at, action, actor_user_id, details')
    .eq('resource_type', resourceType)
    .eq('resource_id', resourceId)
    .order('created_at', { ascending: false })
    .limit(40);

  if (error) {
    console.error('[TrustSafetyAuditTrail]', error);
    return (
      <p className="text-sm text-muted">
        Audit log unavailable (run latest migrations if this persists).
      </p>
    );
  }

  const rows = (data ?? []) as Row[];
  if (rows.length === 0) {
    return <p className="text-sm text-muted">No audit events yet.</p>;
  }

  return (
    <ul className="space-y-2 text-sm">
      {rows.map((r) => (
        <li
          key={r.id}
          className="p-3 rounded-lg border border-border bg-surface2 font-mono text-xs text-muted break-words"
        >
          <span className="text-text">{new Date(r.created_at).toLocaleString()}</span>
          {' · '}
          <span className="text-accent">{r.action}</span>
          {r.actor_user_id ? (
            <>
              {' · '}
              <span>actor {r.actor_user_id}</span>
            </>
          ) : null}
          {r.details && Object.keys(r.details).length > 0 ? (
            <pre className="mt-1 whitespace-pre-wrap text-[11px] opacity-90">{JSON.stringify(r.details, null, 2)}</pre>
          ) : null}
        </li>
      ))}
    </ul>
  );
}
