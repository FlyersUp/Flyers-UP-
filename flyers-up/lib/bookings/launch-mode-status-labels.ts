/** Collapsed booking status copy for launch mode (customer / pro). */

const STATUS_LABELS_FALLBACK: Record<string, string> = {
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

export function launchModeCustomerBookingLabel(status: string): string {
  const s = (status || '').toLowerCase();
  if (['cancelled', 'declined', 'expired_unpaid', 'cancelled_expired', 'cancelled_by_customer', 'cancelled_by_pro', 'cancelled_admin'].includes(s)) {
    return 'Cancelled';
  }
  if (['requested', 'pending', 'awaiting_deposit_payment', 'payment_required', 'accepted'].includes(s)) {
    return 'Deposit due';
  }
  if (['deposit_paid', 'on_the_way', 'pro_en_route', 'in_progress'].includes(s)) {
    return 'Job in progress';
  }
  if (
    [
      'work_completed_by_pro',
      'awaiting_customer_confirmation',
      'completed_pending_payment',
      'awaiting_payment',
      'awaiting_remaining_payment',
    ].includes(s)
  ) {
    return 'Pay balance';
  }
  if (['completed', 'paid', 'fully_paid'].includes(s)) return 'Completed';
  return STATUS_LABELS_FALLBACK[s] ?? s.replaceAll('_', ' ');
}

export function launchModeProBookingLabel(status: string): string {
  const s = (status || '').toLowerCase();
  if (['cancelled', 'declined', 'expired_unpaid', 'cancelled_expired', 'cancelled_by_customer', 'cancelled_by_pro', 'cancelled_admin'].includes(s)) {
    return 'Cancelled';
  }
  if (
    ['requested', 'pending', 'awaiting_deposit_payment', 'payment_required', 'accepted', 'deposit_paid'].includes(s)
  ) {
    return 'Upcoming job';
  }
  if (['on_the_way', 'pro_en_route', 'in_progress'].includes(s)) {
    return 'In progress';
  }
  if (
    [
      'work_completed_by_pro',
      'awaiting_customer_confirmation',
      'completed_pending_payment',
      'awaiting_payment',
      'awaiting_remaining_payment',
    ].includes(s)
  ) {
    return 'Completed';
  }
  if (['completed', 'paid', 'fully_paid'].includes(s)) return 'Getting paid';
  return STATUS_LABELS_FALLBACK[s] ?? s.replaceAll('_', ' ');
}
