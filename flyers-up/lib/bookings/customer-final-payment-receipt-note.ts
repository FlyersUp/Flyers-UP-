import type { CustomerRemainingPaymentUiState } from '@/lib/bookings/customer-remaining-payment-ui';

/** Context line for the receipt / pricing card final-payment row. */
export function finalPaymentReceiptNote(state: CustomerRemainingPaymentUiState): string | null {
  switch (state.kind) {
    case 'review_window_auto':
      return 'Final payment will auto-charge after the review window';
    case 'post_review_auto_pending':
    case 'processing':
      return 'Processing final payment';
    case 'success':
      return 'Final payment paid';
    case 'failed':
    case 'requires_action':
      return 'Final payment failed — retry required';
    case 'before_completion':
      return 'Final payment will be scheduled after the service is completed';
    default:
      return null;
  }
}
