import type { MatchQueueRow } from '@/lib/hybrid-ui/types';

function urgencyLabel(u: string): string {
  if (u === 'asap') return 'Immediate';
  if (u === 'today') return 'Next day';
  return 'Flexible';
}

function statusLabel(s: string): string {
  const m: Record<string, string> = {
    pending_review: 'Matching',
    candidate_selected: 'Matching',
    offer_sent: 'Offer sent',
    accepted: 'Accepted',
    declined: 'Declined',
    expired: 'Expired',
    matched: 'Matched',
    fallback_needed: 'Fallback',
  };
  return m[s] ?? s;
}

export function mapMatchRequestToQueueRow(
  row: Record<string, unknown>,
  customerName: string
): MatchQueueRow {
  const id = String(row.id);
  const urg = String(row.urgency ?? 'flexible');
  const st = String(row.status ?? 'pending_review');
  return {
    id,
    displayId: `#FU-${id.slice(0, 4).toUpperCase()}`,
    customerName,
    occupation: String(row.occupation_slug ?? '—'),
    borough: String(row.borough_slug ?? '—'),
    urgency: urg === 'asap' || urg === 'today' || urg === 'flexible' ? urg : 'flexible',
    urgencyLabel: urgencyLabel(urg),
    status: st,
    statusLabel: statusLabel(st),
    createdAt: String(row.created_at ?? new Date().toISOString()),
  };
}
