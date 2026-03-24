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
