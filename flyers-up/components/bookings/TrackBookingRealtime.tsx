'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabaseClient';

export interface TrackBookingData {
  id: string;
  status: string;
  paymentStatus?: string;
  createdAt: string;
  acceptedAt?: string | null;
  onTheWayAt?: string | null;
  startedAt?: string | null;
  completedAt?: string | null;
  statusHistory?: { status: string; at: string }[];
  serviceName?: string;
  proName?: string;
  serviceDate?: string;
  serviceTime?: string;
  address?: string;
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
  }, [initialBooking.id, initialBooking.status]);

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
        () => {
          void refresh();
        }
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
