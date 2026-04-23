import type { SupabaseClient } from '@supabase/supabase-js';

/** Mirrors SQL gate trust checks (ghost + chronic no-response). */
export type SupplyTrustContext = {
  profile_updated_at: string | null;
  no_response_count_30d: number;
  had_booking_60d: boolean;
  had_outreach_response_60d: boolean;
};

function emptyTrust(): SupplyTrustContext {
  return {
    profile_updated_at: null,
    no_response_count_30d: 0,
    had_booking_60d: false,
    had_outreach_response_60d: false,
  };
}

/**
 * Batch-load trust signals for gate-aligned filtering (admin client only).
 */
export async function fetchSupplyTrustByProId(
  admin: SupabaseClient,
  proIds: string[]
): Promise<Map<string, SupplyTrustContext>> {
  const map = new Map<string, SupplyTrustContext>();
  for (const id of proIds) map.set(id, emptyTrust());
  if (proIds.length === 0) return map;

  const { data: spRows } = await admin.from('service_pros').select('id, user_id').in('id', proIds);
  const userByPro = new Map<string, string>();
  for (const r of spRows ?? []) {
    const row = r as { id: string; user_id: string };
    userByPro.set(String(row.id), String(row.user_id));
  }

  const userIds = [...new Set([...userByPro.values()])];
  if (userIds.length > 0) {
    const { data: profs } = await admin.from('profiles').select('id, updated_at').in('id', userIds);
    const userUpdated = new Map<string, string>();
    for (const pr of profs ?? []) {
      const row = pr as { id: string; updated_at: string };
      userUpdated.set(String(row.id), String(row.updated_at));
    }
    for (const [pid, uid] of userByPro) {
      const u = userUpdated.get(uid);
      if (u) {
        const cur = map.get(pid) ?? emptyTrust();
        cur.profile_updated_at = u;
        map.set(pid, cur);
      }
    }
  }

  const since30 = new Date(Date.now() - 30 * 86400000).toISOString();
  const { data: nrRows } = await admin
    .from('match_outreach_log')
    .select('pro_id')
    .in('pro_id', proIds)
    .eq('outreach_status', 'no_response')
    .gte('sent_at', since30);
  for (const r of nrRows ?? []) {
    const pid = String((r as { pro_id: string }).pro_id);
    const cur = map.get(pid) ?? emptyTrust();
    cur.no_response_count_30d += 1;
    map.set(pid, cur);
  }

  const since60 = new Date(Date.now() - 60 * 86400000).toISOString();
  const { data: bkRows } = await admin
    .from('bookings')
    .select('pro_id')
    .in('pro_id', proIds)
    .gte('created_at', since60)
    .is('cancelled_at', null);
  const booked = new Set((bkRows ?? []).map((r) => String((r as { pro_id: string }).pro_id)));
  for (const pid of booked) {
    const cur = map.get(pid) ?? emptyTrust();
    cur.had_booking_60d = true;
    map.set(pid, cur);
  }

  const { data: respRows } = await admin
    .from('match_outreach_log')
    .select('pro_id')
    .in('pro_id', proIds)
    .not('responded_at', 'is', null)
    .gte('responded_at', since60);
  const responded = new Set((respRows ?? []).map((r) => String((r as { pro_id: string }).pro_id)));
  for (const pid of responded) {
    const cur = map.get(pid) ?? emptyTrust();
    cur.had_outreach_response_60d = true;
    map.set(pid, cur);
  }

  return map;
}
