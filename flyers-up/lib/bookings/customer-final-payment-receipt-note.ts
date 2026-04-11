import type { CustomerPaymentCardKind } from '@/lib/bookings/customer-payment-card-normalize';
import type { MoneyState } from '@/lib/bookings/money-state';

/** Context line for the receipt / pricing card from {@link MoneyState}. */
export function finalPaymentReceiptNoteFromMoneyState(state: MoneyState): string | null {
  if (state.customerCardVariant === 'unknown_balance') {
    return 'Payment status unclear — use the actions below or contact support';
  }
  if (state.customerCardVariant === 'legacy_pending_manual') {
    return 'Remaining payment pending — this booking may need manual completion';
  }
  switch (state.final) {
    case 'final_review_window':
      return 'Final payment will auto-charge after the 24-hour review window';
    case 'final_processing':
      return 'Processing final payment';
    case 'final_due':
      return 'Remaining balance due — pay now or wait for automatic charge';
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
      return 'Remaining balance due — pay now or wait for automatic charge';
    case 'pending_manual':
      return 'Remaining payment pending — this booking may need manual completion';
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
