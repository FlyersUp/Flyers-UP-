import { inferPaymentPhaseFromBookingIds } from '@/lib/bookings/unified-receipt';
import type { BookingFinalPaymentIntentIdRow } from '@/lib/bookings/money-state';

export type WebhookPaymentKind = 'deposit' | 'remaining' | 'legacy_full';

/**
 * Routes a succeeded PI to deposit vs final vs legacy — uses **phase / id routing keys only**,
 * not fee analytics. Financial cents for reconciliation come from
 * {@link normalizeBookingPaymentMetadata} + `bookings` frozen columns in apply handlers.
 */
export function resolveWebhookPaymentKind(
  meta: Record<string, string | undefined>,
  paymentIntentId: string,
  booking: BookingFinalPaymentIntentIdRow
): WebhookPaymentKind {
  const phase = (meta.payment_phase ?? meta.phase ?? '').toLowerCase();
  if (phase === 'full' || phase === 'single') return 'legacy_full';
  if (phase === 'deposit') return 'deposit';
  if (phase === 'remaining' || phase === 'final') return 'remaining';

  const pt = (meta.paymentType ?? '').toLowerCase();
  if (pt === 'deposit') return 'deposit';
  if (pt === 'remaining' || pt === 'final') return 'remaining';

  const inferred = inferPaymentPhaseFromBookingIds(paymentIntentId, booking);
  if (inferred === 'deposit') return 'deposit';
  if (inferred === 'remaining') return 'remaining';
  return 'legacy_full';
}
