/**
 * Pro booking eligibility based on reliability.
 * Enforces: threshold breaches block accepting new bookings.
 */

const MIN_RELIABILITY_TO_ACCEPT = 30;

export interface ProEligibilityResult {
  canAccept: boolean;
  reason?: string;
  reliabilityScore?: number;
}

export async function checkProBookingEligibility(proId: string): Promise<ProEligibilityResult> {
  const { createSupabaseAdmin } = await import('@/lib/supabase/server-admin');
  const admin = createSupabaseAdmin();

  const { data: proRef } = await admin
    .from('service_pros')
    .select('user_id, closed_at')
    .eq('id', proId)
    .maybeSingle();
  if (!proRef) {
    return { canAccept: false, reason: 'Pro profile not found.' };
  }
  const uid = String((proRef as { user_id: string }).user_id);
  if ((proRef as { closed_at?: string | null }).closed_at) {
    return { canAccept: false, reason: 'This pro account is closed.' };
  }
  const { data: prof } = await admin.from('profiles').select('account_status').eq('id', uid).maybeSingle();
  if ((prof as { account_status?: string | null } | null)?.account_status !== 'active') {
    return { canAccept: false, reason: 'This pro account is not active.' };
  }

  const { data: rel } = await admin
    .from('pro_reliability')
    .select('reliability_score, booking_restriction_level, no_show_count_30d')
    .eq('pro_id', proId)
    .maybeSingle();

  const score = (rel as { reliability_score?: number } | null)?.reliability_score ?? 100;
  const restrictionLevel = (rel as { booking_restriction_level?: number } | null)?.booking_restriction_level ?? 0;
  const noShowCount = (rel as { no_show_count_30d?: number } | null)?.no_show_count_30d ?? 0;

  if (restrictionLevel > 0) {
    return {
      canAccept: false,
      reason: 'Your account has temporary booking restrictions. Contact support.',
      reliabilityScore: score,
    };
  }

  if (score < MIN_RELIABILITY_TO_ACCEPT) {
    return {
      canAccept: false,
      reason: 'Your reliability score is too low to accept new bookings.',
      reliabilityScore: score,
    };
  }

  return { canAccept: true, reliabilityScore: score };
}
