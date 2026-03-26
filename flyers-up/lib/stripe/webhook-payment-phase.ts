import { inferPaymentPhaseFromBookingIds } from '@/lib/bookings/unified-receipt';

export type WebhookPaymentKind = 'deposit' | 'remaining' | 'legacy_full';

export function resolveWebhookPaymentKind(
  meta: Record<string, string | undefined>,
  paymentIntentId: string,
  booking: {
    stripe_payment_intent_deposit_id?: string | null;
    stripe_payment_intent_remaining_id?: string | null;
    payment_intent_id?: string | null;
    final_payment_intent_id?: string | null;
  }
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
