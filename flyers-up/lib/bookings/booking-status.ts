/**
 * Booking status constants and transition helpers.
 */

export const STATUS = {
  PENDING_PRO_ACCEPTANCE: 'pending_pro_acceptance',
  AWAITING_DEPOSIT_PAYMENT: 'awaiting_deposit_payment',
  DEPOSIT_PAID: 'deposit_paid',
  ON_THE_WAY: 'on_the_way',
  IN_PROGRESS: 'in_progress',
  WORK_COMPLETED_BY_PRO: 'work_completed_by_pro',
  AWAITING_CUSTOMER_CONFIRMATION: 'awaiting_customer_confirmation',
  COMPLETED: 'completed',
  CANCELLED_EXPIRED: 'cancelled_expired',
  CANCELLED_BY_CUSTOMER: 'cancelled_by_customer',
  CANCELLED_BY_PRO: 'cancelled_by_pro',
  CANCELLED_ADMIN: 'cancelled_admin',
} as const;

export type BookingStatus = (typeof STATUS)[keyof typeof STATUS];

const CANCELLED_STATUSES: readonly string[] = [
  STATUS.CANCELLED_EXPIRED,
  STATUS.CANCELLED_BY_CUSTOMER,
  STATUS.CANCELLED_BY_PRO,
  STATUS.CANCELLED_ADMIN,
  'cancelled',
  'declined',
  'expired_unpaid',
];

/** Allowed transitions (from -> to). Extend as needed. */
const TRANSITIONS: Record<string, string[]> = {
  [STATUS.PENDING_PRO_ACCEPTANCE]: [STATUS.AWAITING_DEPOSIT_PAYMENT, STATUS.CANCELLED_BY_PRO, STATUS.CANCELLED_ADMIN],
  [STATUS.AWAITING_DEPOSIT_PAYMENT]: [STATUS.DEPOSIT_PAID, STATUS.CANCELLED_EXPIRED, STATUS.CANCELLED_BY_CUSTOMER],
  [STATUS.DEPOSIT_PAID]: [STATUS.ON_THE_WAY, 'pro_en_route', STATUS.IN_PROGRESS, STATUS.CANCELLED_BY_CUSTOMER, STATUS.CANCELLED_BY_PRO],
  [STATUS.ON_THE_WAY]: [STATUS.IN_PROGRESS],
  [STATUS.IN_PROGRESS]: [STATUS.WORK_COMPLETED_BY_PRO],
  [STATUS.WORK_COMPLETED_BY_PRO]: [STATUS.AWAITING_CUSTOMER_CONFIRMATION, STATUS.COMPLETED],
  [STATUS.AWAITING_CUSTOMER_CONFIRMATION]: [STATUS.COMPLETED],
  // Legacy status aliases
  requested: [STATUS.AWAITING_DEPOSIT_PAYMENT, 'accepted', 'declined'],
  accepted: [STATUS.DEPOSIT_PAID, STATUS.AWAITING_DEPOSIT_PAYMENT],
  payment_required: [STATUS.DEPOSIT_PAID, STATUS.CANCELLED_EXPIRED],
  pro_en_route: [STATUS.IN_PROGRESS],
  completed_pending_payment: [STATUS.COMPLETED, 'fully_paid', 'paid'],
  awaiting_payment: [STATUS.COMPLETED, 'fully_paid', 'paid'],
};

export function isCancelled(status: string): boolean {
  return CANCELLED_STATUSES.includes(status);
}

export function canTransition(from: string, to: string): boolean {
  const allowed = TRANSITIONS[from] ?? [];
  return allowed.includes(to);
}
