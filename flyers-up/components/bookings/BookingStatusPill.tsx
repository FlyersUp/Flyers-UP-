'use client';

/**
 * Booking status → StatusPill mapping for consistent status visuals.
 * Flow: requested → accepted → en_route → in_progress → completed → paid
 */

import { StatusPill } from '@/components/ui/StatusPill';

const LABELS: Record<string, string> = {
  requested: 'Requested',
  pending: 'Pending',
  accepted: 'Accepted',
  payment_required: 'Payment required',
  deposit_paid: 'Deposit paid',
  pro_en_route: 'On the way',
  on_the_way: 'On the way',
  arrived: 'Arrived',
  in_progress: 'In progress',
  completed_pending_payment: 'Completed',
  awaiting_payment: 'Awaiting payment',
  awaiting_remaining_payment: 'Awaiting payment',
  awaiting_customer_confirmation: 'Awaiting confirmation',
  completed: 'Completed',
  paid: 'Paid',
  fully_paid: 'Paid',
  payout_pending: 'Payout processing',
  cancelled: 'Cancelled',
  declined: 'Declined',
  expired_unpaid: 'Expired',
};

type Tone = 'success' | 'pending' | 'warning' | 'dispute';

function statusToTone(status: string): Tone {
  const s = (status || '').toLowerCase();
  if (['completed', 'paid', 'fully_paid'].includes(s)) return 'success';
  if (['cancelled', 'declined', 'expired_unpaid', 'failed'].includes(s)) return 'dispute';
  if (['awaiting_payment', 'awaiting_remaining_payment', 'awaiting_customer_confirmation', 'payment_required'].includes(s))
    return 'warning';
  return 'pending';
}

export interface BookingStatusPillProps {
  status: string;
  className?: string;
}

export function BookingStatusPill({ status, className }: BookingStatusPillProps) {
  const label = LABELS[(status || '').toLowerCase()] ?? status.replaceAll('_', ' ');
  const tone = statusToTone(status);
  return (
    <StatusPill tone={tone} className={className}>
      {label}
    </StatusPill>
  );
}
