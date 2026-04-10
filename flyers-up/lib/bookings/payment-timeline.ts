import type { CustomerRemainingPaymentUiState } from '@/lib/bookings/customer-remaining-payment-ui';
import type { CustomerPaymentCardKind } from '@/lib/bookings/customer-payment-card-normalize';

export type PaymentTimelineStepStatus = 'complete' | 'current' | 'upcoming' | 'failed' | 'processing';

export type PaymentTimelineModel = {
  deposit: PaymentTimelineStepStatus;
  completed: PaymentTimelineStepStatus;
  autoCharge: PaymentTimelineStepStatus;
  paid: PaymentTimelineStepStatus;
};

/**
 * Maps lifecycle UI state to the four-step payment timeline (Deposit → Completed → Auto-charge → Paid).
 */
export function timelineForRemainingPaymentState(
  state: CustomerRemainingPaymentUiState
): PaymentTimelineModel | null {
  switch (state.kind) {
    case 'none':
      return null;
    case 'before_completion':
      return {
        deposit: 'complete',
        completed: 'upcoming',
        autoCharge: 'upcoming',
        paid: 'upcoming',
      };
    case 'review_window_auto':
      return {
        deposit: 'complete',
        completed: 'complete',
        autoCharge: 'current',
        paid: 'upcoming',
      };
    case 'post_review_auto_pending':
      return {
        deposit: 'complete',
        completed: 'complete',
        autoCharge: 'processing',
        paid: 'upcoming',
      };
    case 'processing':
      return {
        deposit: 'complete',
        completed: 'complete',
        autoCharge: 'processing',
        paid: 'upcoming',
      };
    case 'success':
      return {
        deposit: 'complete',
        completed: 'complete',
        autoCharge: 'complete',
        paid: 'complete',
      };
    case 'failed':
    case 'requires_action':
      return {
        deposit: 'complete',
        completed: 'complete',
        autoCharge: 'failed',
        paid: 'upcoming',
      };
    default:
      return null;
  }
}

/**
 * Timeline for normalized customer payment card kinds (legacy + new flow).
 */
export function timelineForPaymentCardKind(kind: CustomerPaymentCardKind): PaymentTimelineModel | null {
  switch (kind) {
    case 'none':
      return null;
    case 'before_completion':
      return {
        deposit: 'complete',
        completed: 'upcoming',
        autoCharge: 'upcoming',
        paid: 'upcoming',
      };
    case 'scheduled':
      return {
        deposit: 'complete',
        completed: 'complete',
        autoCharge: 'current',
        paid: 'upcoming',
      };
    case 'processing':
      return {
        deposit: 'complete',
        completed: 'complete',
        autoCharge: 'processing',
        paid: 'upcoming',
      };
    case 'action_required':
      return {
        deposit: 'complete',
        completed: 'complete',
        autoCharge: 'failed',
        paid: 'upcoming',
      };
    case 'pending_manual':
    case 'unknown':
      return {
        deposit: 'complete',
        completed: 'complete',
        autoCharge: 'current',
        paid: 'upcoming',
      };
    case 'paid':
      return {
        deposit: 'complete',
        completed: 'complete',
        autoCharge: 'complete',
        paid: 'complete',
      };
    default:
      return null;
  }
}
