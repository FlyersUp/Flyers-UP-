import { PAYOUT_AUTO_RELEASE_REVIEW_HOURS } from '@/lib/bookings/state-machine';

const MS_PER_HOUR = 60 * 60 * 1000;

/**
 * Short status line for pros: marketplace review window → transfer initiated → paid out.
 */
export function getProAutomatedPayoutStatusMessage(input: {
  completedAt?: string | null;
  paidRemainingAt?: string | null;
  payoutReleased?: boolean | null;
  payoutStatus?: string | null;
}): string | null {
  if (!input.paidRemainingAt || !input.completedAt) return null;
  const st = (input.payoutStatus ?? '').toLowerCase();
  if (input.payoutReleased === true) {
    if (st === 'succeeded' || st === 'paid') return 'Payout sent';
    return 'Payment released — your payout is processing';
  }
  const end = new Date(input.completedAt).getTime() + PAYOUT_AUTO_RELEASE_REVIEW_HOURS * MS_PER_HOUR;
  if (Date.now() < end) return 'Payment pending review window';
  return 'Payout is being released — check back shortly';
}
