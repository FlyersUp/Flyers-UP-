'use client';

/**
 * Realtime provider for a single booking.
 * Subscribes to Supabase postgres_changes on bookings table.
 * Provides booking state via React context. Cleans up on unmount.
 */

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  useCallback,
  type ReactNode,
} from 'react';
import { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabaseClient';

export interface BookingRealtimeState {
  id: string;
  status: string;
  paymentDueAt?: string | null;
  paidDepositAt?: string | null;
  paidRemainingAt?: string | null;
  payoutStatus?: string | null;
  refundStatus?: string | null;
  amountDeposit?: number | null;
  amountRemaining?: number | null;
  amountTotal?: number | null;
  [key: string]: unknown;
}

const BookingRealtimeContext = createContext<BookingRealtimeState | null>(null);

export function useBookingRealtime() {
  return useContext(BookingRealtimeContext);
}

interface BookingRealtimeProviderProps {
  bookingId: string;
  initialBooking: BookingRealtimeState;
  fetchBooking: () => Promise<BookingRealtimeState | null>;
  children: ReactNode;
}

export function BookingRealtimeProvider({
  bookingId,
  initialBooking,
  fetchBooking,
  children,
}: BookingRealtimeProviderProps) {
  const [booking, setBooking] = useState<BookingRealtimeState>(initialBooking);
  const channelRef = useRef<RealtimeChannel | null>(null);

  const refresh = useCallback(async () => {
    const b = await fetchBooking();
    if (b) setBooking(b);
  }, [fetchBooking]);

  useEffect(() => {
    setBooking(initialBooking);
  }, [initialBooking.id, initialBooking.status]);

  useEffect(() => {
    const channel = supabase
      .channel(`booking-realtime-${bookingId}`)
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
      void supabase.removeChannel(channel);
    };
  }, [bookingId, refresh]);

  return (
    <BookingRealtimeContext.Provider value={booking}>
      {children}
    </BookingRealtimeContext.Provider>
  );
}
