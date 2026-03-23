/**
 * Pro-visible booking status mapping.
 * Single source of truth for which statuses appear in Pro UI.
 * Deposit-paid bookings must be included so pros see them after customer pays.
 */

/** Statuses for Incoming: bookings needing pro acknowledgment/review */
export const INCOMING_STATUSES = [
  'requested',
  'deposit_paid',
  'awaiting_deposit_payment',
  'payment_required',
  'accepted',
  'pending_pro_acceptance',
  'accepted_pending_payment',
] as const;

/** Statuses for Open Jobs: active work in progress */
export const OPEN_JOBS_STATUSES = [
  'deposit_paid',
  'accepted',
  'pro_en_route',
  'on_the_way',
  'arrived',
  'in_progress',
  'completed_pending_payment',
  'awaiting_payment',
  'awaiting_remaining_payment',
  'awaiting_customer_confirmation',
] as const;

/** Statuses for Today at a Glance: service_date is today */
export const TODAY_AT_GLANCE_STATUSES = [
  'deposit_paid',
  'accepted',
  'pro_en_route',
  'on_the_way',
  'arrived',
  'in_progress',
  'completed_pending_payment',
  'awaiting_payment',
  'awaiting_remaining_payment',
  'awaiting_customer_confirmation',
] as const;

/** Statuses pro can "Start" (head to job / mark in progress) */
export const CAN_START_STATUSES = [
  'deposit_paid',
  'requested',
  'accepted',
  'pro_en_route',
  'on_the_way',
  'pending',
] as const;

export function isIncomingStatus(s: string): boolean {
  return INCOMING_STATUSES.includes(s as (typeof INCOMING_STATUSES)[number]);
}

export function isOpenJobStatus(s: string): boolean {
  return OPEN_JOBS_STATUSES.includes(s as (typeof OPEN_JOBS_STATUSES)[number]);
}

export function isTodayAtGlanceStatus(s: string): boolean {
  return TODAY_AT_GLANCE_STATUSES.includes(s as (typeof TODAY_AT_GLANCE_STATUSES)[number]);
}

export function canProStart(s: string): boolean {
  return CAN_START_STATUSES.includes(s as (typeof CAN_START_STATUSES)[number]);
}
