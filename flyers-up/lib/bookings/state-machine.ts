/**
 * Centralized booking state machine and payout guardrails.
 *
 * NON-NEGOTIABLE: No payout before verified arrival + verified start + verified completion.
 * deposit_paid does NOT mean pro earned money — funds are held until rules are met.
 */

export const BOOKING_STATUS = {
  REQUESTED: 'requested',
  ACCEPTED: 'accepted',
  DEPOSIT_DUE: 'deposit_due',
  DEPOSIT_PAID: 'deposit_paid',
  AWAITING_PRO_ARRIVAL: 'awaiting_pro_arrival',
  PRO_EN_ROUTE: 'pro_en_route',
  ARRIVED: 'arrived',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  CUSTOMER_CONFIRMED: 'customer_confirmed',
  AUTO_CONFIRMED: 'auto_confirmed',
  PAYOUT_ELIGIBLE: 'payout_eligible',
  PAYOUT_RELEASED: 'payout_released',
  CANCELED_CUSTOMER: 'cancelled_by_customer',
  CANCELED_PRO: 'cancelled_by_pro',
  CANCELED_NO_SHOW_PRO: 'canceled_no_show_pro',
  CANCELED_NO_SHOW_CUSTOMER: 'canceled_no_show_customer',
  REFUND_PENDING: 'refund_pending',
  REFUNDED: 'refunded',
  DISPUTED: 'disputed',
} as const;

export type BookingStatus = (typeof BOOKING_STATUS)[keyof typeof BOOKING_STATUS];

/** Statuses where payout is NEVER allowed */
const NO_PAYOUT_STATUSES: readonly string[] = [
  BOOKING_STATUS.REQUESTED,
  BOOKING_STATUS.ACCEPTED,
  BOOKING_STATUS.DEPOSIT_DUE,
  BOOKING_STATUS.DEPOSIT_PAID,
  BOOKING_STATUS.AWAITING_PRO_ARRIVAL,
  BOOKING_STATUS.PRO_EN_ROUTE,
  BOOKING_STATUS.ARRIVED,
  'accepted',
  'payment_required',
  'awaiting_deposit_payment',
  'deposit_paid',
  'on_the_way',
  'pro_en_route',
  'arrived',
];

/** Allowed transitions: from -> [to...] */
const TRANSITIONS: Record<string, readonly string[]> = {
  requested: ['accepted', 'declined', 'cancelled_by_customer'],
  pending: ['accepted', 'awaiting_deposit_payment', 'declined', 'cancelled_by_customer'],
  accepted: ['awaiting_deposit_payment', 'deposit_due', 'payment_required', 'cancelled_by_pro', 'cancelled_by_customer'],
  awaiting_deposit_payment: ['deposit_paid', 'deposit_due', 'cancelled_expired', 'cancelled_by_customer'],
  deposit_due: ['deposit_paid', 'cancelled_expired', 'cancelled_by_customer'],
  payment_required: ['deposit_paid', 'cancelled_expired', 'cancelled_by_customer'],
  deposit_paid: [
    'awaiting_pro_arrival',
    'pro_en_route',
    'on_the_way',
    'in_progress',
    'cancelled_by_customer',
    'cancelled_by_pro',
    'canceled_no_show_pro',
  ],
  awaiting_pro_arrival: [
    'pro_en_route',
    'on_the_way',
    'canceled_no_show_pro',
    'cancelled_by_customer',
    'cancelled_by_pro',
  ],
  pro_en_route: ['arrived', 'in_progress', 'canceled_no_show_pro', 'cancelled_by_customer', 'cancelled_by_pro'],
  on_the_way: ['arrived', 'in_progress', 'canceled_no_show_pro', 'cancelled_by_customer', 'cancelled_by_pro'],
  arrived: ['in_progress', 'canceled_no_show_pro', 'cancelled_by_customer', 'cancelled_by_pro'],
  in_progress: [
    'awaiting_remaining_payment',
    'work_completed_by_pro',
    'cancelled_by_customer',
    'cancelled_by_pro',
    'disputed',
  ],
  work_completed_by_pro: ['awaiting_remaining_payment', 'awaiting_customer_confirmation', 'completed'],
  awaiting_remaining_payment: ['awaiting_customer_confirmation', 'completed', 'cancelled_by_customer'],
  awaiting_customer_confirmation: [
    BOOKING_STATUS.CUSTOMER_CONFIRMED,
    BOOKING_STATUS.AUTO_CONFIRMED,
    'completed',
    'disputed',
  ],
  completed: [BOOKING_STATUS.CUSTOMER_CONFIRMED, BOOKING_STATUS.AUTO_CONFIRMED, 'payout_eligible', 'disputed'],
  customer_confirmed: ['payout_eligible', 'payout_released', 'disputed'],
  auto_confirmed: ['payout_eligible', 'payout_released', 'disputed'],
  payout_eligible: ['payout_released', 'disputed'],
};

/**
 * Validates that a status transition is allowed.
 */
export function canTransition(from: string, to: string): boolean {
  const allowed = TRANSITIONS[from] ?? [];
  return allowed.includes(to);
}

/**
 * Hard guard: payout must NEVER be released from these statuses.
 */
export function isPayoutBlockedStatus(status: string): boolean {
  return NO_PAYOUT_STATUSES.includes(status);
}

/**
 * When `bookings.status` lags `payment_lifecycle_status`, payout transfer eligibility follows **money
 * pipeline** truth first: if lifecycle already marks final settlement / payout queue (`payout_ready`,
 * `final_paid`, …), do not reject solely on a stale workflow label in `bookings.status`.
 */
export function payoutLifecycleSkipsWorkflowBlocklist(lifecycleStatus: string | null | undefined): boolean {
  const lc = String(lifecycleStatus ?? '').trim().toLowerCase();
  return (
    lc === 'paid' ||
    lc === 'final_paid' ||
    lc === 'payout_ready' ||
    lc === 'payout_sent'
  );
}

/** Hours after job completion before automatic marketplace payout release (cron). */
export const PAYOUT_AUTO_RELEASE_REVIEW_HOURS = 24;

export interface PayoutEligibilityInput {
  status: string;
  /** When set to a post-final lifecycle, {@link isPayoutBlockedStatus} is skipped (money truth wins). */
  payment_lifecycle_status?: string | null;
  arrived_at: string | null;
  started_at: string | null;
  completed_at: string | null;
  customer_confirmed: boolean;
  auto_confirm_at: string | null;
  dispute_open: boolean;
  cancellation_reason: string | null;
  paid_deposit_at: string | null;
  paid_remaining_at: string | null;
  refund_status: string | null;
  /** Blocks auto-confirm path; customer_confirmed can override */
  suspicious_completion?: boolean;
  /** Multi-day jobs: every milestone must be confirmed/auto_confirmed with no open milestone dispute */
  is_multi_day?: boolean;
  /** Required true when is_multi_day is true; ignored when false/undefined */
  multi_day_schedule_ok?: boolean;
  /**
   * Admin manual transfer: skip customer/auto-confirm and suspicious-completion gates;
   * still requires arrived/started/completed, payments, no refund pending, etc.
   */
  adminTransferOverride?: boolean;
  /**
   * Automatic cron transfer: use completed_at + hours instead of customer/auto confirm.
   * When set, suspicious_completion always blocks (admin must approve).
   */
  autoReleaseAfterCompletionHours?: number | null;
}

/**
 * Determines if a booking is eligible for payout release.
 * ALL conditions must be met.
 */
export function isPayoutEligible(input: PayoutEligibilityInput): { eligible: boolean; reason?: string } {
  const now = new Date().toISOString();

  if (
    !payoutLifecycleSkipsWorkflowBlocklist(input.payment_lifecycle_status) &&
    isPayoutBlockedStatus(input.status)
  ) {
    return { eligible: false, reason: 'Booking not in confirmed/completed state' };
  }
  if (!input.arrived_at) {
    return { eligible: false, reason: 'Pro has not arrived (arrived_at is null)' };
  }
  if (!input.started_at) {
    return { eligible: false, reason: 'Job has not been started (started_at is null)' };
  }
  if (!input.completed_at) {
    return { eligible: false, reason: 'Job has not been completed (completed_at is null)' };
  }
  if (input.cancellation_reason === 'pro_no_show') {
    return { eligible: false, reason: 'Booking was canceled for pro no-show' };
  }
  if (input.dispute_open) {
    return { eligible: false, reason: 'Dispute is open' };
  }
  if (!input.paid_deposit_at || !input.paid_remaining_at) {
    return { eligible: false, reason: 'Payment not complete (deposit or remaining not paid)' };
  }
  if (input.refund_status === 'pending') {
    return { eligible: false, reason: 'Refund is pending' };
  }
  if (input.refund_status === 'succeeded') {
    return { eligible: false, reason: 'Refund already processed (customer fully refunded)' };
  }

  if (!input.adminTransferOverride) {
    const hours = input.autoReleaseAfterCompletionHours;
    if (hours != null && hours > 0) {
      if (input.suspicious_completion) {
        return { eligible: false, reason: 'Suspicious completion requires admin review' };
      }
      if (!input.completed_at) {
        return { eligible: false, reason: 'Job has not been completed (completed_at is null)' };
      }
      const deadline = new Date(input.completed_at).getTime() + hours * 60 * 60 * 1000;
      if (Date.now() < deadline) {
        return { eligible: false, reason: 'Post-completion review window has not passed' };
      }
    } else {
      const confirmed =
        input.customer_confirmed || (input.auto_confirm_at != null && input.auto_confirm_at < now);
      if (!confirmed) {
        return { eligible: false, reason: 'Customer has not confirmed and auto-confirm window has not passed' };
      }

      if (input.suspicious_completion && !input.customer_confirmed) {
        return { eligible: false, reason: 'Suspicious completion requires customer confirmation' };
      }
    }
  }

  if (input.is_multi_day) {
    if (input.multi_day_schedule_ok !== true) {
      return { eligible: false, reason: 'Multi-day milestones are not fully confirmed' };
    }
  }

  return { eligible: true };
}

/**
 * Statuses that count as "confirmed" for payout (customer or auto).
 */
export const PAYOUT_CONFIRMED_STATUSES = [
  BOOKING_STATUS.CUSTOMER_CONFIRMED,
  BOOKING_STATUS.AUTO_CONFIRMED,
  'completed', // legacy - completed after confirm
] as const;
