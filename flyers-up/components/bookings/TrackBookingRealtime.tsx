'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabaseClient';
import { scheduleRemoveSupabaseChannel } from '@/lib/supabaseChannelCleanup';
import type { PendingRescheduleInfo } from '@/lib/bookings/pending-reschedule';

export interface TrackBookingData {
  id: string;
  proId?: string | null;
  status: string;
  paymentStatus?: string;
  paidAt?: string | null;
  paidDepositAt?: string | null;
  paidRemainingAt?: string | null;
  finalPaymentStatus?: string | null;
  fullyPaidAt?: string | null;
  paymentDueAt?: string | null;
  remainingDueAt?: string | null;
  autoConfirmAt?: string | null;
  platformFeeCents?: number | null;
  refundStatus?: string | null;
  refundedTotalCents?: number | null;
  amountDeposit?: number | null;
  amountRemaining?: number | null;
  amountTotal?: number | null;
  price?: number;
  createdAt: string;
  acceptedAt?: string | null;
  onTheWayAt?: string | null;
  enRouteAt?: string | null;
  arrivedAt?: string | null;
  startedAt?: string | null;
  completedAt?: string | null;
  statusHistory?: { status: string; at: string }[];
  serviceName?: string;
  proName?: string;
  serviceDate?: string;
  serviceTime?: string;
  bookingTimezone?: string | null;
  address?: string;
  pendingReschedule?: PendingRescheduleInfo | null;
  hasCustomerReview?: boolean;
  /** Explicit customer completion confirmation (bookings.customer_confirmed). */
  customerConfirmed?: boolean;
  confirmedByCustomerAt?: string | null;
  paymentLifecycleStatus?: string | null;
  customerReviewDeadlineAt?: string | null;
  payoutReleased?: boolean | null;
  requiresAdminReview?: boolean | null;
  payoutHoldReason?: string | null;
  suspiciousCompletion?: boolean | null;
  suspiciousCompletionReason?: string | null;
  adminHold?: boolean | null;
  finalPaymentIntentId?: string | null;
  /** Same value as {@link finalPaymentIntentStripeStatus} when API sends this alias. */
  finalPaymentIntentStatus?: string | null;
  finalPaymentIntentStripeStatus?: string | null;
  finalPaymentIntentStripeLiveChecked?: boolean;
  payoutTransferId?: string | null;
}

interface TrackBookingRealtimeProps {
  bookingId: string;
  initialBooking: TrackBookingData;
  fetchBooking: () => Promise<TrackBookingData | null>;
  children: (booking: TrackBookingData) => React.ReactNode;
}

/**
 * Subscribes to Supabase Realtime for booking row changes and updates local state.
 * Customer sees progress as the pro changes status.
 */
export function TrackBookingRealtime({
  bookingId,
  initialBooking,
  fetchBooking,
  children,
}: TrackBookingRealtimeProps) {
  const [booking, setBooking] = useState<TrackBookingData>(initialBooking);
  const channelRef = useRef<RealtimeChannel | null>(null);

  const refresh = useCallback(async () => {
    const b = await fetchBooking();
    if (b) setBooking(b);
  }, [fetchBooking]);

  useEffect(() => {
    setBooking(initialBooking);
  }, [
    initialBooking.id,
    initialBooking.status,
    initialBooking.serviceDate,
    initialBooking.serviceTime,
    initialBooking.pendingReschedule?.id,
    initialBooking.paymentLifecycleStatus,
    initialBooking.finalPaymentStatus,
    initialBooking.customerReviewDeadlineAt,
    initialBooking.remainingDueAt,
    initialBooking.finalPaymentIntentId,
    initialBooking.finalPaymentIntentStatus,
    initialBooking.finalPaymentIntentStripeStatus,
    initialBooking.finalPaymentIntentStripeLiveChecked,
  ]);

  useEffect(() => {
    const channel = supabase
      .channel(`track-booking-${bookingId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'bookings',
          filter: `id=eq.${bookingId}`,
        },
        () => queueMicrotask(() => void refresh())
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      channelRef.current = null;
      scheduleRemoveSupabaseChannel(supabase, channel);
    };
  }, [bookingId, refresh]);

  return <>{children(booking)}</>;
}
