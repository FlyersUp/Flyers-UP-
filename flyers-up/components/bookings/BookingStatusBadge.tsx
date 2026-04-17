'use client';

import { isLaunchModeEnabledSync } from '@/lib/featureFlags';
import { launchModeCustomerBookingLabel, launchModeProBookingLabel } from '@/lib/bookings/launch-mode-status-labels';

/** DB statuses that map to UI. Treat requested and pending as equivalent. */
const ACTIVE_STATUSES = [
  'requested', 'pending', 'accepted', 'payment_required', 'deposit_paid', 'pro_en_route', 'on_the_way', 'in_progress', 'completed_pending_payment', 'awaiting_payment', 'awaiting_remaining_payment', 'awaiting_customer_confirmation',
] as const;
const COMPLETED_STATUSES = ['completed', 'fully_paid', 'paid'] as const;
const TERMINAL_STATUSES = ['cancelled', 'declined', 'expired_unpaid'] as const;

const STATUS_LABELS: Record<string, string> = {
  requested: 'Pending',
  pending: 'Pending',
  accepted: 'Accepted',
  payment_required: 'Payment required',
  deposit_paid: 'Deposit paid',
  pro_en_route: 'On the way',
  on_the_way: 'On the way',
  in_progress: 'In progress',
  completed_pending_payment: 'Completed',
  awaiting_payment: 'Completed',
  awaiting_remaining_payment: 'Awaiting remaining payment',
  awaiting_customer_confirmation: 'Awaiting confirmation',
  paid: 'Paid',
  fully_paid: 'Fully paid',
  completed: 'Completed',
  cancelled: 'Cancelled',
  declined: 'Declined',
  expired_unpaid: 'Expired',
};

export interface BookingStatusBadgeProps {
  status: string;
  className?: string;
  /** Customer vs pro copy when launch mode collapses labels. */
  perspective?: 'customer' | 'pro';
}

/**
 * Shared status badge for bookings. Uses Flyers Up accent colors.
 * - Completed/success: #B2FBA5 (green)
 * - Active/in-progress: #FFC067 (orange)
 * - Terminal (cancelled/declined): muted
 * - Pending: muted
 */
export function BookingStatusBadge({ status, className = '', perspective = 'customer' }: BookingStatusBadgeProps) {
  const s = (status || '').toLowerCase();
  const label = isLaunchModeEnabledSync()
    ? perspective === 'pro'
      ? launchModeProBookingLabel(s)
      : launchModeCustomerBookingLabel(s)
    : STATUS_LABELS[s] ?? status.replaceAll('_', ' ');

  let bg: string;
  if (COMPLETED_STATUSES.includes(s as typeof COMPLETED_STATUSES[number]) || s === 'awaiting_payment' || s === 'completed_pending_payment' || s === 'paid' || s === 'fully_paid' || s === 'awaiting_customer_confirmation') {
    bg = '#B2FBA5';
  } else if (ACTIVE_STATUSES.includes(s as typeof ACTIVE_STATUSES[number]) && !['requested', 'pending'].includes(s)) {
    bg = '#FFC067';
  } else if (TERMINAL_STATUSES.includes(s as typeof TERMINAL_STATUSES[number]) || s === 'expired_unpaid') {
    bg = 'hsl(var(--muted) / 0.5)';
  } else {
    bg = 'hsl(var(--muted) / 0.5)';
  }

  return (
    <span
      className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${className}`}
      style={{
        backgroundColor: bg,
        color: 'hsl(var(--text))',
      }}
    >
      {label}
    </span>
  );
}
