'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabaseClient';
import { getBookingById, type BookingDetails } from '@/lib/api';

interface ProBookingRealtimeProps {
  bookingId: string;
  initialBooking: BookingDetails | null;
  children: (booking: BookingDetails | null) => React.ReactNode;
}

/**
 * Subscribes to Supabase Realtime for booking row changes.
 * Pro sees updates as they advance status (or customer cancels).
 */
export function ProBookingRealtime({
  bookingId,
  initialBooking,
  children,
}: ProBookingRealtimeProps) {
  const [booking, setBooking] = useState<BookingDetails | null>(initialBooking);
  const channelRef = useRef<RealtimeChannel | null>(null);

  const refresh = useCallback(async () => {
    const b = await getBookingById(bookingId);
    setBooking(b);
  }, [bookingId]);

  useEffect(() => {
    setBooking(initialBooking);
  }, [initialBooking?.id, initialBooking?.status]);

  useEffect(() => {
    const channel = supabase
      .channel(`pro-booking-${bookingId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'bookings',
          filter: `id=eq.${bookingId}`,
        },
        () => void refresh()
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      channelRef.current = null;
      void supabase.removeChannel(channel);
    };
  }, [bookingId, refresh]);

  return <>{children(booking)}</>;
}
