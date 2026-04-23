import { createAdminSupabaseClient } from '@/lib/supabaseServer';
import { MatchQueueScreen } from '@/components/hybrid/MatchQueueScreen';
import { MOCK_MATCH_QUEUE_ROWS } from '@/lib/hybrid-ui/mock-data';
import { mapMatchRequestToQueueRow } from '@/lib/hybrid-ui/map-match-queue';

export const dynamic = 'force-dynamic';

export default async function AdminMatchQueuePage() {
  const admin = createAdminSupabaseClient();
  const { data: rows, error } = await admin
    .from('match_requests')
    .select(
      'id, customer_id, occupation_slug, borough_slug, preferred_time, urgency, status, created_at, matched_pro_id, booking_id'
    )
    .order('created_at', { ascending: false })
    .limit(200);

  if (error) {
    console.error('[match-queue]', error);
  }

  const customerIds = [...new Set((rows ?? []).map((r) => String((r as { customer_id: string }).customer_id)))];
  const profileById = new Map<string, string>();
  if (customerIds.length > 0) {
    const { data: profs } = await admin.from('profiles').select('id, full_name, email').in('id', customerIds);
    (profs ?? []).forEach((p: { id: string; full_name: string | null; email: string | null }) => {
      profileById.set(String(p.id), p.full_name?.trim() || p.email || String(p.id).slice(0, 8));
    });
  }

  const mapped =
    (rows ?? []).map((r) => {
      const row = r as Record<string, unknown>;
      const cid = String(row.customer_id);
      return mapMatchRequestToQueueRow(row, profileById.get(cid) ?? 'Customer');
    }) ?? [];

  const displayRows = mapped.length > 0 ? mapped : MOCK_MATCH_QUEUE_ROWS;

  return <MatchQueueScreen rows={displayRows} />;
}
