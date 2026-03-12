/**
 * Cancellation + Refund Policy Engine
 * Structured rules for cancellation outcomes based on:
 * - canceled_by, booking stage, time before start, reason, evidence, payments
 */

export const CANCELLATION_POLICY_VERSION = '1.0';

export type CanceledBy = 'customer' | 'pro' | 'admin' | 'system';

export type BookingStage =
  | 'requested'
  | 'accepted'
  | 'deposit_paid'
  | 'pro_en_route'
  | 'in_progress'
  | 'completed';

export type CancellationReasonCode =
  | 'customer_change_plans'
  | 'pro_unavailable'
  | 'no_show_customer'
  | 'no_show_pro'
  | 'late_pro'
  | 'late_customer'
  | 'admin'
  | 'system_expired'
  | 'other';

export type RefundType = 'full' | 'partial' | 'none' | 'admin_override';

export interface CancellationPolicyInput {
  canceledBy: CanceledBy;
  bookingStage: BookingStage;
  scheduledStartAt: Date;
  canceledAt: Date;
  reasonCode: CancellationReasonCode;
  hasEvidence: boolean;
  depositPaidCents: number;
  remainingPaidCents: number;
  depositAmountCents: number;
}

export interface CancellationPolicyDecision {
  refundType: RefundType;
  refundAmountCents: number;
  strikePro: boolean;
  explanation: string;
  manualReviewRequired: boolean;
  policyVersion: string;
  ruleFired: string;
}

function hoursBeforeStart(scheduledAt: Date, canceledAt: Date): number {
  return (scheduledAt.getTime() - canceledAt.getTime()) / (1000 * 60 * 60);
}

export function evaluateCancellationPolicy(input: CancellationPolicyInput): CancellationPolicyDecision {
  const {
    canceledBy,
    bookingStage,
    scheduledStartAt,
    canceledAt,
    reasonCode,
    hasEvidence,
    depositPaidCents,
    remainingPaidCents,
    depositAmountCents,
  } = input;

  const hoursBefore = hoursBeforeStart(scheduledStartAt, canceledAt);
  const base = {
    policyVersion: CANCELLATION_POLICY_VERSION,
    ruleFired: '',
  };

  // Admin override: always allow manual decision
  if (canceledBy === 'admin') {
    return {
      ...base,
      refundType: 'admin_override',
      refundAmountCents: depositPaidCents + remainingPaidCents,
      strikePro: false,
      explanation: 'Admin override — manual refund decision required',
      manualReviewRequired: true,
      ruleFired: 'admin_override',
    };
  }

  // System expired (e.g. deposit timeout)
  if (canceledBy === 'system' && reasonCode === 'system_expired') {
    return {
      ...base,
      refundType: 'full',
      refundAmountCents: 0,
      strikePro: false,
      explanation: 'Booking expired — no payment collected, no refund needed',
      manualReviewRequired: false,
      ruleFired: 'system_expired',
    };
  }

  // Before accept: free cancel
  if (bookingStage === 'requested') {
    return {
      ...base,
      refundType: depositPaidCents > 0 ? 'full' : 'none',
      refundAmountCents: depositPaidCents,
      strikePro: false,
      explanation: 'Canceled before acceptance — full refund if any deposit was collected',
      manualReviewRequired: false,
      ruleFired: 'before_accept',
    };
  }

  // Accepted but deposit unpaid — handled by expire cron
  if (bookingStage === 'accepted' && depositPaidCents === 0) {
    return {
      ...base,
      refundType: 'none',
      refundAmountCents: 0,
      strikePro: false,
      explanation: 'Deposit was never paid — no refund',
      manualReviewRequired: false,
      ruleFired: 'deposit_unpaid',
    };
  }

  // Pro cancels after accept: full customer refund + pro strike (requested already returned above)
  if (canceledBy === 'pro') {
    return {
      ...base,
      refundType: 'full',
      refundAmountCents: depositPaidCents + remainingPaidCents,
      strikePro: true,
      explanation: 'Pro canceled after acceptance — full refund to customer, reliability strike applied',
      manualReviewRequired: false,
      ruleFired: 'pro_cancel_strike',
    };
  }

  // Customer cancels — time-based rules
  if (canceledBy === 'customer') {
    // After in_progress: no refund unless admin
    if (bookingStage === 'in_progress' || bookingStage === 'completed') {
      return {
        ...base,
        refundType: 'none',
        refundAmountCents: 0,
        strikePro: false,
        explanation: 'Customer canceled after job started — deposit non-refundable, manual review for remaining',
        manualReviewRequired: remainingPaidCents > 0,
        ruleFired: 'customer_after_in_progress',
      };
    }

    // After pro_en_route: deposit non-refundable
    if (bookingStage === 'pro_en_route') {
      return {
        ...base,
        refundType: 'none',
        refundAmountCents: 0,
        strikePro: false,
        explanation: 'Customer canceled after Pro was en route — deposit non-refundable',
        manualReviewRequired: false,
        ruleFired: 'customer_after_en_route',
      };
    }

    // deposit_paid or accepted with deposit
    if (hoursBefore >= 24) {
      return {
        ...base,
        refundType: 'full',
        refundAmountCents: depositPaidCents,
        strikePro: false,
        explanation: 'Customer canceled 24+ hours before — full deposit refund',
        manualReviewRequired: false,
        ruleFired: 'customer_24h_plus',
      };
    }
    if (hoursBefore >= 6) {
      const partial = Math.round(depositAmountCents * 0.5);
      return {
        ...base,
        refundType: 'partial',
        refundAmountCents: partial,
        strikePro: false,
        explanation: 'Customer canceled 6–24 hours before — 50% deposit refund',
        manualReviewRequired: false,
        ruleFired: 'customer_6_24h',
      };
    }
    return {
      ...base,
      refundType: 'none',
      refundAmountCents: 0,
      strikePro: false,
      explanation: 'Customer canceled under 6 hours before — deposit non-refundable',
      manualReviewRequired: false,
      ruleFired: 'customer_under_6h',
    };
  }

  // No-show / lateness — evidence required for automated decision
  if (reasonCode === 'no_show_customer' || reasonCode === 'no_show_pro') {
    return {
      ...base,
      refundType: hasEvidence ? (reasonCode === 'no_show_customer' ? 'none' : 'full') : 'admin_override',
      refundAmountCents: hasEvidence && reasonCode === 'no_show_pro' ? depositPaidCents + remainingPaidCents : 0,
      strikePro: hasEvidence && reasonCode === 'no_show_customer',
      explanation: hasEvidence
        ? 'No-show with evidence — automated decision'
        : 'No-show — insufficient evidence, manual review required',
      manualReviewRequired: !hasEvidence,
      ruleFired: reasonCode === 'no_show_customer' ? 'no_show_customer' : 'no_show_pro',
    };
  }

  if (reasonCode === 'late_pro') {
    return {
      ...base,
      refundType: hasEvidence ? 'full' : 'admin_override',
      refundAmountCents: hasEvidence ? depositPaidCents + remainingPaidCents : 0,
      strikePro: hasEvidence,
      explanation: hasEvidence
        ? 'Pro late beyond threshold — full refund, strike applied'
        : 'Late Pro — insufficient evidence, manual review required',
      manualReviewRequired: !hasEvidence,
      ruleFired: 'late_pro',
    };
  }

  // Default
  return {
    ...base,
    refundType: 'admin_override',
    refundAmountCents: 0,
    strikePro: false,
    explanation: 'Uncategorized cancellation — manual review required',
    manualReviewRequired: true,
    ruleFired: 'default_manual',
  };
}

export function mapDbStatusToBookingStage(status: string): BookingStage {
  const s = String(status).toLowerCase();
  if (s === 'requested' || s === 'pending') return 'requested';
  if (s === 'accepted' || s === 'payment_required' || s === 'awaiting_deposit_payment') return 'accepted';
  if (s === 'deposit_paid' || s === 'awaiting_deposit_payment') return 'accepted';
  if (s.includes('deposit') && s.includes('paid')) return 'deposit_paid';
  if (s === 'pro_en_route' || s === 'on_the_way' || s === 'arrived') return 'pro_en_route';
  if (s === 'in_progress' || s === 'started') return 'in_progress';
  if (s.includes('completed') || s.includes('paid') || s.includes('awaiting')) return 'completed';
  return 'accepted';
}
