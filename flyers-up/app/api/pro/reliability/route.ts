/**
 * GET /api/pro/reliability
 * Pro's reliability score and account warnings.
 * Surface in pro dashboard for transparency.
 */
import { NextResponse } from 'next/server';
import { createServerSupabaseClient, createAdminSupabaseClient } from '@/lib/supabaseServer';

export const runtime = 'nodejs';
export const preferredRegion = ['cle1'];
export const dynamic = 'force-dynamic';

const MIN_RELIABILITY_TO_ACCEPT = 30;
const NO_SHOW_THRESHOLD_URGENT = 2;

export async function GET() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: pro } = await supabase
    .from('service_pros')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle();
  if (!pro?.id) {
    return NextResponse.json({ error: 'Pro not found' }, { status: 403 });
  }

  const admin = createAdminSupabaseClient();
  const { data: rel } = await admin
    .from('pro_reliability')
    .select('reliability_score, no_show_count_30d, late_arrival_count_30d, booking_restriction_level')
    .eq('pro_id', pro.id)
    .maybeSingle();

  const score = (rel as { reliability_score?: number } | null)?.reliability_score ?? 100;
  const noShowCount = (rel as { no_show_count_30d?: number } | null)?.no_show_count_30d ?? 0;
  const lateCount = (rel as { late_arrival_count_30d?: number } | null)?.late_arrival_count_30d ?? 0;
  const restricted = ((rel as { booking_restriction_level?: number } | null)?.booking_restriction_level ?? 0) > 0;

  const warnings: { id: string; title: string; message: string }[] = [];
  if (restricted) {
    warnings.push({
      id: 'restricted',
      title: 'Booking restrictions',
      message: 'Your account has temporary restrictions. Contact support.',
    });
  } else if (score < MIN_RELIABILITY_TO_ACCEPT) {
    warnings.push({
      id: 'low-reliability',
      title: 'Low reliability score',
      message: 'Your reliability score is below the threshold to accept new bookings.',
    });
  } else if (score < 70) {
    warnings.push({
      id: 'reliability-warning',
      title: 'Reliability below average',
      message: 'Improve on-time arrivals and completion to restore your ranking.',
    });
  }
  if (noShowCount >= NO_SHOW_THRESHOLD_URGENT) {
    warnings.push({
      id: 'no-show-urgent',
      title: 'Same-day jobs limited',
      message: `You have ${noShowCount} no-show(s) in the last 30 days. Same-day/urgent requests are temporarily unavailable.`,
    });
  }
  if (lateCount >= 3) {
    warnings.push({
      id: 'late-arrivals',
      title: 'Late arrivals',
      message: `You have ${lateCount} late arrival(s) in the last 30 days. On-time arrivals help your reliability score.`,
    });
  }

  return NextResponse.json({
    reliabilityScore: score,
    canAcceptBookings: !restricted && score >= MIN_RELIABILITY_TO_ACCEPT,
    noShowCount30d: noShowCount,
    lateArrivalCount30d: lateCount,
    warnings,
  });
}
