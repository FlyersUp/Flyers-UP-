/**
 * Track booking status config — headlines and explanatory text per state.
 * Maps DB status to customer-facing copy for the status header.
 */

export type TrackBookingState =
  | 'confirmed'
  | 'pro_reviewing'
  | 'pro_en_route'
  | 'in_progress'
  | 'completed'
  | 'delayed';

export interface StatusConfig {
  state: TrackBookingState;
  headline: string;
  explanation: string;
  /** Icon hint for future use */
  icon?: string;
}

const CONFIG: Record<string, StatusConfig> = {
  requested: {
    state: 'pro_reviewing',
    headline: 'Pro reviewing your booking',
    explanation: 'Your pro is reviewing the details. You’ll get an update once they confirm.',
  },
  pending: {
    state: 'pro_reviewing',
    headline: 'Pro reviewing your booking',
    explanation: 'Your pro is reviewing the details. You’ll get an update once they confirm.',
  },
  accepted: {
    state: 'confirmed',
    headline: 'Booking confirmed',
    explanation: 'Your pro has accepted. They’ll arrive at the scheduled time.',
  },
  payment_required: {
    state: 'confirmed',
    headline: 'Deposit required',
    explanation: 'Pay your deposit to lock in the booking.',
  },
  deposit_paid: {
    state: 'confirmed',
    headline: 'Booking confirmed',
    explanation: 'Your deposit is paid. Your pro will arrive at the scheduled time.',
  },
  awaiting_deposit_payment: {
    state: 'confirmed',
    headline: 'Deposit required',
    explanation: 'Pay your deposit to confirm the booking.',
  },
  accepted_pending_payment: {
    state: 'confirmed',
    headline: 'Deposit required',
    explanation: 'Pay your deposit to confirm the booking.',
  },
  pro_en_route: {
    state: 'pro_en_route',
    headline: 'Pro on the way',
    explanation: 'Your pro is headed to you. They’ll arrive at the scheduled time.',
  },
  on_the_way: {
    state: 'pro_en_route',
    headline: 'Pro on the way',
    explanation: 'Your pro is headed to you. They’ll arrive at the scheduled time.',
  },
  arrived: {
    state: 'in_progress',
    headline: 'Pro has arrived',
    explanation: 'Your pro is at the location. The job is underway.',
  },
  in_progress: {
    state: 'in_progress',
    headline: 'Job in progress',
    explanation: 'Your pro is working on the job. You’ll be notified when it’s complete.',
  },
  completed_pending_payment: {
    state: 'completed',
    headline: 'Job completed',
    explanation: 'The job is done. Pay the remaining balance to finish.',
  },
  awaiting_payment: {
    state: 'completed',
    headline: 'Job completed',
    explanation: 'The job is done. Pay the remaining balance to finish.',
  },
  awaiting_remaining_payment: {
    state: 'completed',
    headline: 'Pay remaining balance',
    explanation: 'The job is complete. Pay the remaining amount to finish.',
  },
  awaiting_customer_confirmation: {
    state: 'completed',
    headline: 'Job completed',
    explanation: 'Confirm everything looks good so we can release payment.',
  },
  completed: {
    state: 'completed',
    headline: 'Job completed',
    explanation: 'Thanks for booking. Leave a review when you’re ready.',
  },
  review_pending: {
    state: 'completed',
    headline: 'Job completed',
    explanation: 'Thanks for booking. Leave a review when you’re ready.',
  },
  paid: {
    state: 'completed',
    headline: 'All set',
    explanation: 'Payment complete. Thanks for booking with Flyers Up.',
  },
  fully_paid: {
    state: 'completed',
    headline: 'All set',
    explanation: 'Payment complete. Thanks for booking with Flyers Up.',
  },
  cancelled: {
    state: 'completed',
    headline: 'Booking cancelled',
    explanation: 'This booking has been cancelled.',
  },
  declined: {
    state: 'completed',
    headline: 'Booking declined',
    explanation: 'The pro was unable to take this booking.',
  },
  expired_unpaid: {
    state: 'completed',
    headline: 'Booking expired',
    explanation: 'This booking expired before payment.',
  },
};

export function getStatusConfig(dbStatus: string): StatusConfig {
  const s = (dbStatus || '').toLowerCase();
  return CONFIG[s] ?? {
    state: 'confirmed',
    headline: 'Booking confirmed',
    explanation: 'Your booking is in progress. Check back for updates.',
  };
}
