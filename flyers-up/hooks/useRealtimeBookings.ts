'use client';

/**
 * Realtime Booking Hooks
 * 
 * These hooks subscribe to Supabase Realtime to get live updates
 * for bookings. They handle:
 * - Initial data fetch
 * - INSERT events (new bookings)
 * - UPDATE events (status changes)
 * - DELETE events (cancelled/removed bookings)
 * - Proper cleanup on unmount
 * 
 * IMPORTANT: Only use these hooks in client components ('use client')
 */

import { useEffect, useState, useCallback, useRef } from 'react';
import { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabaseClient';
import { 
  getCustomerBookings, 
  getProJobs,
  type Booking,
  type StatusHistoryEntry,
} from '@/lib/api';
import { logErr } from '@/lib/utils/logErr';
import { isUuid } from '@/lib/isUuid';

// ============================================
// CUSTOMER BOOKINGS REALTIME HOOK
// ============================================

interface UseCustomerBookingsRealtimeResult {
  bookings: Booking[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

/**
 * Hook for real-time customer bookings.
 * Subscribes to changes on the bookings table filtered by customer_id.
 * 
 * @param customerId - The customer's user ID
 * @returns Object with bookings array, loading state, error, and refetch function
 */
export function useCustomerBookingsRealtime(
  customerId: string | null
): UseCustomerBookingsRealtimeResult {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);

  // Fetch initial data
  const fetchBookings = useCallback(async () => {
    if (!customerId) {
      setBookings([]);
      setLoading(false);
      return;
    }

    try {
      setError(null);
      const data = await getCustomerBookings(customerId);
      setBookings(data);
    } catch (err) {
      console.error('Error fetching customer bookings:', err);
      setError('Failed to load bookings');
    } finally {
      setLoading(false);
    }
  }, [customerId]);

  useEffect(() => {
    if (!customerId) {
      setBookings([]);
      setLoading(false);
      return;
    }

    // Initial fetch
    fetchBookings();

    // Subscribe to realtime changes
    const channel = supabase
      .channel(`customer-bookings-${customerId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'bookings',
          filter: `customer_id=eq.${customerId}`,
        },
        async (payload) => {
          console.log('New booking received:', payload);
          // Refetch to get the fully joined data (with pro name, category, etc.)
          // This is simpler than trying to construct the Booking object from raw payload
          await fetchBookings();
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'bookings',
          filter: `customer_id=eq.${customerId}`,
        },
        async (payload) => {
          console.log('Booking updated:', payload);
          // Update the specific booking in state with status and status_history
          const updatedRow = payload.new as {
            id: string;
            status: string;
            price?: number;
            status_history?: StatusHistoryEntry[];
          };
          
          setBookings((prev) =>
            prev.map((booking) =>
              booking.id === updatedRow.id
                ? {
                    ...booking,
                    status: updatedRow.status as Booking['status'],
                    price: updatedRow.price,
                    statusHistory: updatedRow.status_history,
                  }
                : booking
            )
          );
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'bookings',
          filter: `customer_id=eq.${customerId}`,
        },
        (payload) => {
          console.log('Booking deleted:', payload);
          const deletedId = (payload.old as { id: string }).id;
          setBookings((prev) => prev.filter((booking) => booking.id !== deletedId));
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('Subscribed to customer bookings realtime');
        } else if (status === 'CHANNEL_ERROR') {
          console.error('Error subscribing to customer bookings');
          setError('Failed to connect to live updates');
        }
      });

    channelRef.current = channel;

    // Cleanup subscription on unmount
    return () => {
      if (channelRef.current) {
        console.log('Unsubscribing from customer bookings realtime');
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [customerId, fetchBookings]);

  return {
    bookings,
    loading,
    error,
    refetch: fetchBookings,
  };
}

// ============================================
// PRO BOOKINGS (JOBS) REALTIME HOOK
// ============================================

interface UseProBookingsRealtimeResult {
  jobs: Booking[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

/**
 * Hook for real-time pro jobs (bookings assigned to a service pro).
 * First resolves the pro's service_pros.id, then subscribes to bookings.
 * 
 * @param proUserId - The pro's user ID (from auth.users)
 * @returns Object with jobs array, loading state, error, and refetch function
 */
export function useProBookingsRealtime(
  proUserId: string | null
): UseProBookingsRealtimeResult {
  const [jobs, setJobs] = useState<Booking[]>([]);
  const [proId, setProId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);

  // Fetch the service_pros.id from user_id
  const fetchProId = useCallback(async () => {
    // Check if Supabase is configured
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    
    if (!supabaseUrl || !supabaseAnonKey) {
      // Supabase not configured - no pro id available
      return null;
    }

    try {
      const { data: userData } = await supabase.auth.getUser();
      const user = userData.user;
      if (!user) return null;
      if (!isUuid(user.id)) {
        logErr('Invalid auth user id (expected UUID)', { userId: user.id });
        return null;
      }

      // service_pros stores the auth user id in user_id
      const { data, error: proError } = await supabase
        .from('service_pros')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (proError || !data) {
        // Only log error if it has a message property (meaningful error) and Supabase is configured
        if (proError && supabaseUrl && supabaseAnonKey && proError.message) {
          logErr('Error fetching pro ID:', proError);
        }
        // No pro id available
        return null;
      }

      return data.id;
    } catch (err) {
      // Supabase client not available - no pro id available
      return null;
    }
  }, []);

  // Fetch jobs
  const fetchJobs = useCallback(async () => {
    if (!proUserId) {
      setJobs([]);
      setLoading(false);
      return;
    }

    try {
      setError(null);
      const { data: userData } = await supabase.auth.getUser();
      const user = userData.user;
      if (!user) {
        setJobs([]);
        setLoading(false);
        return;
      }
      const data = await getProJobs(user.id);
      setJobs(data);
    } catch (err) {
      logErr('Error fetching pro jobs:', err);
      setError('Failed to load jobs');
    } finally {
      setLoading(false);
    }
  }, [proUserId]);

  useEffect(() => {
    if (!proUserId) {
      if (channelRef.current) {
        channelRef.current.unsubscribe();
        channelRef.current = null;
      }
      setJobs([]);
      setLoading(false);
      return;
    }

    let isMounted = true;

    const setupSubscription = async () => {
      // First, get the pro's service_pros.id
      const resolvedProId = await fetchProId();
      if (!resolvedProId) {
        // Not logged in OR user has no pro profile yet
        if (channelRef.current) {
          channelRef.current.unsubscribe();
          channelRef.current = null;
        }
        setJobs([]);
        setProId(null);
        setLoading(false);
        return;
      }
      if (!proUserId || !isMounted) return;

      setProId(resolvedProId);

      // Initial fetch
      await fetchJobs();

      // Check if Supabase is configured before setting up subscription
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
      
      if (!supabaseUrl || !supabaseAnonKey) {
        // Supabase not configured - skip realtime subscription for UI-only mode
        setLoading(false);
        return;
      }

      try {
        // Subscribe to realtime changes for this pro's bookings
        const channel = supabase
          .channel(`pro-bookings-${resolvedProId}`)
          .on(
            'postgres_changes',
            {
              event: 'INSERT',
              schema: 'public',
              table: 'bookings',
              filter: `pro_id=eq.${resolvedProId}`,
            },
            async (payload) => {
              console.log('New job received:', payload);
              // Refetch to get fully joined data
              await fetchJobs();
            }
          )
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'bookings',
            filter: `pro_id=eq.${resolvedProId}`,
          },
          async (payload) => {
            console.log('Job updated:', payload);
            const updatedRow = payload.new as {
              id: string;
              status: string;
              price?: number;
              status_history?: StatusHistoryEntry[];
            };

            setJobs((prev) =>
              prev.map((job) =>
                job.id === updatedRow.id
                  ? {
                      ...job,
                      status: updatedRow.status as Booking['status'],
                      price: updatedRow.price,
                      statusHistory: updatedRow.status_history,
                    }
                  : job
              )
            );
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'DELETE',
            schema: 'public',
            table: 'bookings',
            filter: `pro_id=eq.${resolvedProId}`,
          },
          (payload) => {
            console.log('Job deleted:', payload);
            const deletedId = (payload.old as { id: string }).id;
            setJobs((prev) => prev.filter((job) => job.id !== deletedId));
          }
        )
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            console.log('Subscribed to pro bookings realtime');
          } else if (status === 'CHANNEL_ERROR') {
            console.error('Error subscribing to pro bookings');
            setError('Failed to connect to live updates');
          }
        });

        channelRef.current = channel;
      } catch (err) {
        // Supabase not available - skip realtime subscription for UI-only mode
        console.warn('Supabase realtime subscription not available:', err);
      }
    };

    setupSubscription();

    // Cleanup
    return () => {
      isMounted = false;
      if (channelRef.current) {
        try {
          console.log('Unsubscribing from pro bookings realtime');
          supabase.removeChannel(channelRef.current);
          channelRef.current = null;
        } catch (err) {
          // Ignore errors when cleaning up if Supabase isn't available
        }
      }
    };
  }, [proUserId, fetchProId, fetchJobs]);

  return {
    jobs,
    loading,
    error,
    refetch: fetchJobs,
  };
}

