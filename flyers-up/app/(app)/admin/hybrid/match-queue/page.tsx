import { createAdminSupabaseClient } from '@/lib/supabaseServer';
import { MatchQueueScreen } from '@/components/hybrid/MatchQueueScreen';
import type { AdminKpiStat } from '@/lib/hybrid-ui/types';
import { mapMatchRequestToQueueRow } from '@/lib/hybrid-ui/map-match-queue';
import { boroughLabelFromSlug } from '@/lib/marketplace/nycBoroughs';

export const dynamic = 'force-dynamic';

function computeQueueKpis(statuses: string[]): AdminKpiStat[] {
  const pending = statuses.filter((s) => s === 'pending_review' || s === 'candidate_selected' || s === 'fallback_needed').length;
  const offersSent = statuses.filter((s) => s === 'offer_sent').length;
  const accepted = statuses.filter((s) => s === 'accepted' || s === 'matched').length;
  const expired = statuses.filter((s) => s === 'expired').length;
  const terminal = accepted + expired;
  const acceptedRate = terminal > 0 ? `${Math.round((accepted / terminal) * 100)}% win rate` : undefined;
  return [
    { id: 'pending', label: 'Pending Requests', value: pending, trendLabel: 'Live' },
    { id: 'offers', label: 'Offers Sent', value: offersSent, trendLabel: 'Live' },
    { id: 'accepted', label: 'Accepted', value: accepted, hint: acceptedRate },
    { id: 'expired', label: 'Expired', value: expired, trendLabel: terminal > 0 ? `${Math.round((expired / terminal) * 100)}%` : '0%' },
  ];
}

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

  const occupationSlugs = [...new Set((rows ?? []).map((r) => String((r as { occupation_slug: string | null }).occupation_slug ?? '')).filter(Boolean))];
  const occupationNameBySlug = new Map<string, string>();
  if (occupationSlugs.length > 0) {
    const { data: occupations } = await admin.from('occupations').select('slug, name').in('slug', occupationSlugs);
    (occupations ?? []).forEach((o: { slug: string; name: string | null }) => {
      occupationNameBySlug.set(String(o.slug), o.name?.trim() || String(o.slug));
    });
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
      const base = mapMatchRequestToQueueRow(row, profileById.get(cid) ?? 'Customer');
      const occupationSlug = String(row.occupation_slug ?? '');
      return {
        ...base,
        occupation: occupationNameBySlug.get(occupationSlug) ?? base.occupation,
        borough: boroughLabelFromSlug(base.borough),
      };
    }) ?? [];

  const statuses = (rows ?? []).map((r) => String((r as { status: string | null }).status ?? ''));
  const kpis = computeQueueKpis(statuses);

  return <MatchQueueScreen rows={mapped} kpis={kpis} />;
}
