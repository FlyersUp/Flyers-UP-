/**
 * Smart Notification System - Type constants and mappings.
 * 3-5 notifications per booking max. Only meaningful state changes.
 */

export const NOTIFICATION_TYPES = {
  BOOKING_REQUESTED: 'booking.requested',
  BOOKING_ACCEPTED: 'booking.accepted',
  BOOKING_DECLINED: 'booking.declined',
  BOOKING_CONFIRMED: 'booking.confirmed',
  BOOKING_ON_THE_WAY: 'booking.on_the_way',
  BOOKING_STARTED: 'booking.started',
  BOOKING_COMPLETED: 'booking.completed',
  BOOKING_CANCELED: 'booking.canceled',
  BOOKING_RESCHEDULE_REQUESTED: 'booking.reschedule_requested',
  BOOKING_RESCHEDULE_UPDATED: 'booking.reschedule_updated',
  MESSAGE_RECEIVED: 'message.received',
  PAYMENT_DEPOSIT_PAID: 'payment.deposit_paid',
  PAYMENT_FAILED: 'payment.failed',
  PAYMENT_BALANCE_DUE: 'payment.balance_due',
  PAYMENT_REMAINING_PAID: 'payment.remaining_paid',
  PAYMENT_REFUNDED: 'payment.refunded',
  PAYOUT_SENT: 'payout.sent',
  PAYOUT_FAILED: 'payout.failed',
  REVIEW_RECEIVED: 'review.received',
  ACCOUNT_VERIFIED: 'account.verified',
  ACCOUNT_ACTION_REQUIRED: 'account.action_required',
} as const;

export type NotificationType = (typeof NOTIFICATION_TYPES)[keyof typeof NOTIFICATION_TYPES];

export const NOTIFICATION_CATEGORIES = {
  BOOKING: 'booking',
  MESSAGE: 'message',
  PAYMENT: 'payment',
  PAYOUT: 'payout',
  REVIEW: 'review',
  ACCOUNT: 'account',
  MARKETING: 'marketing',
} as const;

export type NotificationCategory = (typeof NOTIFICATION_CATEGORIES)[keyof typeof NOTIFICATION_CATEGORIES];

export const NOTIFICATION_PRIORITIES = {
  CRITICAL: 'critical',
  IMPORTANT: 'important',
  INFORMATIONAL: 'informational',
} as const;

export type NotificationPriority = (typeof NOTIFICATION_PRIORITIES)[keyof typeof NOTIFICATION_PRIORITIES];

/** Mapping: type -> category */
export const TYPE_TO_CATEGORY: Record<NotificationType, NotificationCategory> = {
  [NOTIFICATION_TYPES.BOOKING_REQUESTED]: NOTIFICATION_CATEGORIES.BOOKING,
  [NOTIFICATION_TYPES.BOOKING_ACCEPTED]: NOTIFICATION_CATEGORIES.BOOKING,
  [NOTIFICATION_TYPES.BOOKING_DECLINED]: NOTIFICATION_CATEGORIES.BOOKING,
  [NOTIFICATION_TYPES.BOOKING_CONFIRMED]: NOTIFICATION_CATEGORIES.BOOKING,
  [NOTIFICATION_TYPES.BOOKING_ON_THE_WAY]: NOTIFICATION_CATEGORIES.BOOKING,
  [NOTIFICATION_TYPES.BOOKING_STARTED]: NOTIFICATION_CATEGORIES.BOOKING,
  [NOTIFICATION_TYPES.BOOKING_COMPLETED]: NOTIFICATION_CATEGORIES.BOOKING,
  [NOTIFICATION_TYPES.BOOKING_CANCELED]: NOTIFICATION_CATEGORIES.BOOKING,
  [NOTIFICATION_TYPES.BOOKING_RESCHEDULE_REQUESTED]: NOTIFICATION_CATEGORIES.BOOKING,
  [NOTIFICATION_TYPES.BOOKING_RESCHEDULE_UPDATED]: NOTIFICATION_CATEGORIES.BOOKING,
  [NOTIFICATION_TYPES.MESSAGE_RECEIVED]: NOTIFICATION_CATEGORIES.MESSAGE,
  [NOTIFICATION_TYPES.PAYMENT_DEPOSIT_PAID]: NOTIFICATION_CATEGORIES.PAYMENT,
  [NOTIFICATION_TYPES.PAYMENT_FAILED]: NOTIFICATION_CATEGORIES.PAYMENT,
  [NOTIFICATION_TYPES.PAYMENT_BALANCE_DUE]: NOTIFICATION_CATEGORIES.PAYMENT,
  [NOTIFICATION_TYPES.PAYMENT_REMAINING_PAID]: NOTIFICATION_CATEGORIES.PAYMENT,
  [NOTIFICATION_TYPES.PAYMENT_REFUNDED]: NOTIFICATION_CATEGORIES.PAYMENT,
  [NOTIFICATION_TYPES.PAYOUT_SENT]: NOTIFICATION_CATEGORIES.PAYOUT,
  [NOTIFICATION_TYPES.PAYOUT_FAILED]: NOTIFICATION_CATEGORIES.PAYOUT,
  [NOTIFICATION_TYPES.REVIEW_RECEIVED]: NOTIFICATION_CATEGORIES.REVIEW,
  [NOTIFICATION_TYPES.ACCOUNT_VERIFIED]: NOTIFICATION_CATEGORIES.ACCOUNT,
  [NOTIFICATION_TYPES.ACCOUNT_ACTION_REQUIRED]: NOTIFICATION_CATEGORIES.ACCOUNT,
};

/** MVP priority types (10) */
export const MVP_TYPES: NotificationType[] = [
  NOTIFICATION_TYPES.BOOKING_REQUESTED,
  NOTIFICATION_TYPES.BOOKING_ACCEPTED,
  NOTIFICATION_TYPES.BOOKING_DECLINED,
  NOTIFICATION_TYPES.MESSAGE_RECEIVED,
  NOTIFICATION_TYPES.BOOKING_ON_THE_WAY,
  NOTIFICATION_TYPES.BOOKING_STARTED,
  NOTIFICATION_TYPES.BOOKING_COMPLETED,
  NOTIFICATION_TYPES.PAYMENT_FAILED,
  NOTIFICATION_TYPES.PAYOUT_SENT,
  NOTIFICATION_TYPES.BOOKING_CANCELED,
];

export interface NotificationPayload {
  type: NotificationType;
  title: string;
  body: string;
  category: NotificationCategory;
  priority: NotificationPriority;
  deepLink: string;
  /** For push: should send push when user away */
  pushEligible: boolean;
  /** For customer vs pro targeting */
  customerOnly?: boolean;
  proOnly?: boolean;
}

export const notificationPayloads: Record<NotificationType, Omit<NotificationPayload, 'deepLink'>> = {
  [NOTIFICATION_TYPES.BOOKING_REQUESTED]: {
    type: NOTIFICATION_TYPES.BOOKING_REQUESTED,
    title: 'Booking request sent',
    body: 'Your booking request has been sent.' as const,
    category: NOTIFICATION_CATEGORIES.BOOKING,
    priority: NOTIFICATION_PRIORITIES.INFORMATIONAL,
    pushEligible: false,
    customerOnly: true,
  },
  [NOTIFICATION_TYPES.BOOKING_ACCEPTED]: {
    type: NOTIFICATION_TYPES.BOOKING_ACCEPTED,
    title: 'Booking accepted',
    body: 'Your booking was accepted. Pay the deposit within 30 minutes to lock your time.',
    category: NOTIFICATION_CATEGORIES.BOOKING,
    priority: NOTIFICATION_PRIORITIES.IMPORTANT,
    pushEligible: true,
    customerOnly: true,
  },
  [NOTIFICATION_TYPES.BOOKING_DECLINED]: {
    type: NOTIFICATION_TYPES.BOOKING_DECLINED,
    title: 'Booking declined',
    body: 'The pro declined your booking request.',
    category: NOTIFICATION_CATEGORIES.BOOKING,
    priority: NOTIFICATION_PRIORITIES.IMPORTANT,
    pushEligible: true,
    customerOnly: true,
  },
  [NOTIFICATION_TYPES.BOOKING_CONFIRMED]: {
    type: NOTIFICATION_TYPES.BOOKING_CONFIRMED,
    title: 'Booking confirmed',
    body: 'Your booking is confirmed.',
    category: NOTIFICATION_CATEGORIES.BOOKING,
    priority: NOTIFICATION_PRIORITIES.IMPORTANT,
    pushEligible: true,
  },
  [NOTIFICATION_TYPES.BOOKING_ON_THE_WAY]: {
    type: NOTIFICATION_TYPES.BOOKING_ON_THE_WAY,
    title: 'Pro is on the way',
    body: 'Your pro is heading to your location.',
    category: NOTIFICATION_CATEGORIES.BOOKING,
    priority: NOTIFICATION_PRIORITIES.IMPORTANT,
    pushEligible: true,
    customerOnly: true,
  },
  [NOTIFICATION_TYPES.BOOKING_STARTED]: {
    type: NOTIFICATION_TYPES.BOOKING_STARTED,
    title: 'Job started',
    body: 'Your pro has started the job.',
    category: NOTIFICATION_CATEGORIES.BOOKING,
    priority: NOTIFICATION_PRIORITIES.IMPORTANT,
    pushEligible: true,
    customerOnly: true,
  },
  [NOTIFICATION_TYPES.BOOKING_COMPLETED]: {
    type: NOTIFICATION_TYPES.BOOKING_COMPLETED,
    title: 'Pro finished',
    body: 'Pro finished — pay remaining to confirm.',
    category: NOTIFICATION_CATEGORIES.BOOKING,
    priority: NOTIFICATION_PRIORITIES.IMPORTANT,
    pushEligible: true,
    customerOnly: true,
  },
  [NOTIFICATION_TYPES.BOOKING_CANCELED]: {
    type: NOTIFICATION_TYPES.BOOKING_CANCELED,
    title: 'Booking canceled',
    body: 'Booking was canceled.',
    category: NOTIFICATION_CATEGORIES.BOOKING,
    priority: NOTIFICATION_PRIORITIES.IMPORTANT,
    pushEligible: true,
  },
  [NOTIFICATION_TYPES.BOOKING_RESCHEDULE_REQUESTED]: {
    type: NOTIFICATION_TYPES.BOOKING_RESCHEDULE_REQUESTED,
    title: 'Reschedule requested',
    body: 'A reschedule has been requested.',
    category: NOTIFICATION_CATEGORIES.BOOKING,
    priority: NOTIFICATION_PRIORITIES.IMPORTANT,
    pushEligible: true,
  },
  [NOTIFICATION_TYPES.BOOKING_RESCHEDULE_UPDATED]: {
    type: NOTIFICATION_TYPES.BOOKING_RESCHEDULE_UPDATED,
    title: 'Reschedule updated',
    body: 'The booking time has been updated.',
    category: NOTIFICATION_CATEGORIES.BOOKING,
    priority: NOTIFICATION_PRIORITIES.IMPORTANT,
    pushEligible: true,
  },
  [NOTIFICATION_TYPES.MESSAGE_RECEIVED]: {
    type: NOTIFICATION_TYPES.MESSAGE_RECEIVED,
    title: 'New message',
    body: 'You have a new message.',
    category: NOTIFICATION_CATEGORIES.MESSAGE,
    priority: NOTIFICATION_PRIORITIES.IMPORTANT,
    pushEligible: true,
  },
  [NOTIFICATION_TYPES.PAYMENT_DEPOSIT_PAID]: {
    type: NOTIFICATION_TYPES.PAYMENT_DEPOSIT_PAID,
    title: 'Deposit paid',
    body: 'Deposit received. Booking is locked.',
    category: NOTIFICATION_CATEGORIES.PAYMENT,
    priority: NOTIFICATION_PRIORITIES.IMPORTANT,
    pushEligible: true,
  },
  [NOTIFICATION_TYPES.PAYMENT_FAILED]: {
    type: NOTIFICATION_TYPES.PAYMENT_FAILED,
    title: 'Payment failed',
    body: 'There was a problem with your payment. Please update your payment method.',
    category: NOTIFICATION_CATEGORIES.PAYMENT,
    priority: NOTIFICATION_PRIORITIES.CRITICAL,
    pushEligible: true,
  },
  [NOTIFICATION_TYPES.PAYMENT_BALANCE_DUE]: {
    type: NOTIFICATION_TYPES.PAYMENT_BALANCE_DUE,
    title: 'Balance due',
    body: 'Pay the remaining balance to complete your booking.',
    category: NOTIFICATION_CATEGORIES.PAYMENT,
    priority: NOTIFICATION_PRIORITIES.IMPORTANT,
    pushEligible: true,
  },
  [NOTIFICATION_TYPES.PAYMENT_REMAINING_PAID]: {
    type: NOTIFICATION_TYPES.PAYMENT_REMAINING_PAID,
    title: 'Payment complete',
    body: 'Remaining balance has been paid.',
    category: NOTIFICATION_CATEGORIES.PAYMENT,
    priority: NOTIFICATION_PRIORITIES.IMPORTANT,
    pushEligible: true,
  },
  [NOTIFICATION_TYPES.PAYMENT_REFUNDED]: {
    type: NOTIFICATION_TYPES.PAYMENT_REFUNDED,
    title: 'Refund processed',
    body: 'Your refund has been processed.',
    category: NOTIFICATION_CATEGORIES.PAYMENT,
    priority: NOTIFICATION_PRIORITIES.IMPORTANT,
    pushEligible: true,
  },
  [NOTIFICATION_TYPES.PAYOUT_SENT]: {
    type: NOTIFICATION_TYPES.PAYOUT_SENT,
    title: 'Payout sent',
    body: 'Your earnings have been sent to your bank account.',
    category: NOTIFICATION_CATEGORIES.PAYOUT,
    priority: NOTIFICATION_PRIORITIES.IMPORTANT,
    pushEligible: true,
    proOnly: true,
  },
  [NOTIFICATION_TYPES.PAYOUT_FAILED]: {
    type: NOTIFICATION_TYPES.PAYOUT_FAILED,
    title: 'Payout failed',
    body: 'There was a problem with your payout. Please check your payout settings.',
    category: NOTIFICATION_CATEGORIES.PAYOUT,
    priority: NOTIFICATION_PRIORITIES.CRITICAL,
    pushEligible: true,
    proOnly: true,
  },
  [NOTIFICATION_TYPES.REVIEW_RECEIVED]: {
    type: NOTIFICATION_TYPES.REVIEW_RECEIVED,
    title: 'New review',
    body: 'You received a new review.',
    category: NOTIFICATION_CATEGORIES.REVIEW,
    priority: NOTIFICATION_PRIORITIES.INFORMATIONAL,
    pushEligible: false,
  },
  [NOTIFICATION_TYPES.ACCOUNT_VERIFIED]: {
    type: NOTIFICATION_TYPES.ACCOUNT_VERIFIED,
    title: 'Account verified',
    body: 'Your account has been verified.',
    category: NOTIFICATION_CATEGORIES.ACCOUNT,
    priority: NOTIFICATION_PRIORITIES.INFORMATIONAL,
    pushEligible: false,
    proOnly: true,
  },
  [NOTIFICATION_TYPES.ACCOUNT_ACTION_REQUIRED]: {
    type: NOTIFICATION_TYPES.ACCOUNT_ACTION_REQUIRED,
    title: 'Action required',
    body: 'Please complete the required action to continue.',
    category: NOTIFICATION_CATEGORIES.ACCOUNT,
    priority: NOTIFICATION_PRIORITIES.CRITICAL,
    pushEligible: true,
  },
};

export function getDeepLinkForNotification(
  _type: NotificationType,
  bookingId?: string | null,
  conversationId?: string | null,
  basePath?: 'customer' | 'pro'
): string {
  const bp = basePath ?? 'customer';
  if (bookingId) return bp === 'pro' ? `/pro/bookings/${bookingId}` : `/bookings/${bookingId}`;
  if (conversationId) return bp === 'pro' ? `/pro/chat/conversation/${conversationId}` : `/customer/chat/conversation/${conversationId}`;
  return bp === 'pro' ? '/pro/notifications' : '/customer/notifications';
}
