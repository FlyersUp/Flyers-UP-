/**
 * Exclude pros whose profiles are soft-closed (defense in depth vs service_pros.available only).
 */

import type { SupabaseClient } from '@supabase/supabase-js';

export async function getClosedProfileUserIds(admin: SupabaseClient, userIds: string[]): Promise<Set<string>> {
  const unique = [...new Set(userIds)].filter(Boolean);
  if (unique.length === 0) return new Set();

  const { data } = await admin.from('profiles').select('id, account_status').in('id', unique);

  return new Set(
    (data ?? [])
      .filter((p: { account_status?: string | null }) => p.account_status === 'closed')
      .map((p: { id: string }) => p.id)
  );
}
