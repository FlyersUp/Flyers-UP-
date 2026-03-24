/**
 * Recalculates pro reliability score from recent incidents.
 * Incident types: late_15, late_30, no_show, customer_complaint, canceled_after_accept
 * Rolling 30-day window.
 */

import { createSupabaseAdmin } from '@/lib/supabase/server-admin';

const INCIDENT_POINTS: Record<string, number> = {
  late_15: 1,
  late_30: 2,
  no_show: 3,
  customer_complaint: 2,
  canceled_after_accept: 2,
};

const MAX_SCORE = 100;
const MIN_SCORE = 0;

export async function recalculateProReliability(proId: string): Promise<{
  reliability_score: number;
  late_arrival_count_30d: number;
  no_show_count_30d: number;
  cancellation_after_accept_count_30d: number;
}> {
  const admin = createSupabaseAdmin();
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 30);
  const cutoffIso = cutoff.toISOString();

  const { data: incidents, error } = await admin
    .from('pro_booking_incidents')
    .select('incident_type, incident_points')
    .eq('pro_id', proId)
    .gt('expires_at', cutoffIso);

  if (error) {
    console.error('[reliability] failed to fetch incidents', { proId, error });
    return {
      reliability_score: MAX_SCORE,
      late_arrival_count_30d: 0,
      no_show_count_30d: 0,
      cancellation_after_accept_count_30d: 0,
    };
  }

  let totalPoints = 0;
  let lateArrivalCount = 0;
  let noShowCount = 0;
  let cancelAfterAcceptCount = 0;

  for (const i of incidents ?? []) {
    const pts = i.incident_points ?? INCIDENT_POINTS[i.incident_type] ?? 1;
    totalPoints += pts;
    if (i.incident_type === 'late_15' || i.incident_type === 'late_30') lateArrivalCount++;
    if (i.incident_type === 'no_show') noShowCount++;
    if (i.incident_type === 'canceled_after_accept') cancelAfterAcceptCount++;
  }

  const reliability_score = Math.max(MIN_SCORE, Math.min(MAX_SCORE, MAX_SCORE - totalPoints * 5));

  await admin
    .from('pro_reliability')
    .upsert(
      {
        pro_id: proId,
        late_arrival_count_30d: lateArrivalCount,
        no_show_count_30d: noShowCount,
        cancellation_after_accept_count_30d: cancelAfterAcceptCount,
        reliability_score,
        trust_tier:
          reliability_score >= 90
            ? 'premium'
            : reliability_score >= 70
              ? 'standard'
              : reliability_score >= 50
                ? 'at_risk'
                : 'restricted',
        booking_restriction_level: reliability_score < 50 ? 1 : reliability_score < 70 ? 0 : 0,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'pro_id' }
    );

  return {
    reliability_score,
    late_arrival_count_30d: lateArrivalCount,
    no_show_count_30d: noShowCount,
    cancellation_after_accept_count_30d: cancelAfterAcceptCount,
  };
}
