import { createAdminSupabaseClient } from '@/lib/supabaseServer';

export type TrustSafetyResourceType = 'support_ticket' | 'user_report' | 'booking';

/**
 * Append-only audit row. Call with service-role client (bypasses RLS).
 * Failures are logged only; callers should not throw on audit failure.
 */
export async function appendTrustSafetyAudit(
  admin: ReturnType<typeof createAdminSupabaseClient>,
  entry: {
    resource_type: TrustSafetyResourceType;
    resource_id: string;
    action: string;
    actor_user_id: string | null;
    details?: Record<string, unknown>;
  }
): Promise<void> {
  const { error } = await admin.from('trust_safety_audit_log').insert({
    resource_type: entry.resource_type,
    resource_id: entry.resource_id,
    action: entry.action,
    actor_user_id: entry.actor_user_id,
    details: entry.details ?? {},
  });
  if (error) {
    console.error('[trust_safety_audit] insert failed', error);
  }
}
