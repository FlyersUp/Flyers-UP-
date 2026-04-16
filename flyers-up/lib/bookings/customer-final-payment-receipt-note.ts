import type { CustomerPaymentCardKind } from '@/lib/bookings/customer-payment-card-normalize';
import type { MoneyState } from '@/lib/bookings/money-state';

export type FinalPaymentReceiptNoteOpts = {
  refundStatus?: string | null;
  paymentLifecycleStatus?: string | null;
};

/** Context line for the receipt / pricing card from {@link MoneyState}. */
export function finalPaymentReceiptNoteFromMoneyState(
  state: MoneyState,
  opts?: FinalPaymentReceiptNoteOpts
): string | null {
  const rs = String(opts?.refundStatus ?? '').toLowerCase();
  const lc = String(opts?.paymentLifecycleStatus ?? '').toLowerCase();
  if (rs === 'partially_failed') {
    return 'Refund partially completed — Flyers Up is finishing the remaining amount. You are not charged twice.';
  }
  if (rs === 'pending' || lc === 'refund_pending') {
    return 'Refund initiated — it can take a few business days for your bank to show the credit.';
  }
  if (state.customerRefund === 'full' && (rs === 'succeeded' || lc === 'refunded')) {
    return 'Refund completed — thanks for your patience while your bank posts the credit.';
  }
  if (state.customerRefund === 'partial' && (rs === 'succeeded' || lc === 'partially_refunded')) {
    return 'Partial refund completed — your statement timing is set by your bank.';
  }

  if (state.customerCardVariant === 'unknown_balance') {
    return 'Payment status unclear — use the actions below or contact support';
  }
  if (state.customerCardVariant === 'legacy_pending_manual') {
    return 'Balance still pending — complete payment in the app or contact support if this looks wrong';
  }
  switch (state.final) {
    case 'final_review_window':
      return 'Final payment will auto-charge after the 24-hour review window';
    case 'final_processing':
      return 'Processing final payment';
    case 'final_due':
      return 'Balance due — pay in checkout or update your card if an automatic charge did not complete';
    case 'final_failed':
    case 'final_requires_action':
      return 'Final payment failed — retry required';
    case 'final_paid':
      return 'Final payment paid';
    case 'before_completion':
      return 'Final payment will be scheduled after the service is completed';
    default:
      return null;
  }
}

/** Context line for the receipt / pricing card final-payment row (normalized lifecycle). */
export function finalPaymentReceiptNoteFromKind(kind: CustomerPaymentCardKind): string | null {
  switch (kind) {
    case 'scheduled':
      return 'Final payment will auto-charge after the 24-hour review window';
    case 'processing':
      return 'Processing final payment';
    case 'post_review_due':
      return 'Balance due — pay in checkout or update your card if an automatic charge did not complete';
    case 'pending_manual':
      return 'Balance still pending — complete payment in the app or contact support if this looks wrong';
    case 'unknown':
      return 'Payment status unclear — use the actions below or contact support';
    case 'action_required':
      return 'Final payment failed — retry required';
    case 'paid':
      return 'Final payment paid';
    case 'before_completion':
      return 'Final payment will be scheduled after the service is completed';
    default:
      return null;
  }
}
