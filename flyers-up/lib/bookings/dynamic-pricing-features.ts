import type { OccupationFeeProfile } from '@/lib/bookings/fee-rules';
import { resolveUrgency } from '@/lib/bookings/urgency';

export function resolveUrgencyFromBooking(input: {
  urgency?: string | null;
  serviceDate?: string | null;
  serviceTime?: string | null;
  requestedAt?: string | null;
}): 'scheduled' | 'same_day' | 'asap' {
  const explicit = String(input.urgency ?? '').trim().toLowerCase();
  if (explicit === 'same_day') return 'same_day';
  if (explicit === 'asap') return 'asap';
  if (explicit === 'scheduled') return 'scheduled';

  const date = String(input.serviceDate ?? '').trim();
  if (!date) return 'scheduled';
  const time = String(input.serviceTime ?? '12:00').trim() || '12:00';
  const scheduledStartAt = `${date}T${time}:00`;
  return resolveUrgency({
    requestedAt: input.requestedAt ?? null,
    scheduledStartAt,
  });
}

export function resolveAreaDemandScoreFromBooking(): number {
  // No reliable area demand signal wired in booking flow yet.
  return 0;
}

export function resolveSupplyTightnessScoreFromBooking(): number {
  // No reliable realtime supply tightness signal wired in booking flow yet.
  return 0;
}

export function resolveConversionRiskScore(input: {
  serviceSubtotalCents: number;
  isFirstBooking: boolean;
}): number {
  if (input.isFirstBooking && input.serviceSubtotalCents < 3500) return 80;
  if (input.isFirstBooking && input.serviceSubtotalCents < 5000) return 65;
  return 40;
}

export function resolveTrustRiskScore(input: {
  occupationProfile: OccupationFeeProfile;
}): number {
  if (input.occupationProfile === 'premium_trust') return 70;
  if (input.occupationProfile === 'standard') return 40;
  return 25;
}

export function resolveCustomerBookingHistoryFlags(input: {
  completedOrPaidBookingCount?: number | null;
}): { isFirstBooking: boolean; isRepeatCustomer: boolean } {
  const count = Math.max(0, Number(input.completedOrPaidBookingCount ?? 0));
  return {
    isFirstBooking: count === 0,
    isRepeatCustomer: count > 0,
  };
}
