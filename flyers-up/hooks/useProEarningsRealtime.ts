'use client';

/**
 * Realtime Earnings Hook for Service Pros
 * 
 * Subscribes to Supabase Realtime to get live updates when:
 * - New earnings are inserted (booking completed)
 * - Earnings are updated (corrections)
 * - Earnings are deleted (refunds)
 * 
 * SIMPLICITY NOTE: For UPDATE/DELETE events, we refetch the entire
 * earnings summary rather than doing complex diff calculations.
 * This is the simpler approach for now - can be optimized later.
 * 
 * IMPORTANT: Only use this hook in client components ('use client')
 */

import { useEffect, useState, useCallback, useRef } from 'react';
import { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabaseClient';
import { getProEarnings, type EarningsSummary } from '@/lib/api';
import { logErr } from '@/lib/utils/logErr';
import { isUuid } from '@/lib/isUuid';

interface UseProEarningsRealtimeResult {
  earnings: EarningsSummary | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

/**
 * Hook for real-time pro earnings updates.
 * Subscribes to the pro_earnings table for the given pro.
 * 
 * @param proUserId - The pro's user ID (from auth.users)
 * @returns Object with earnings summary, loading state, error, and refetch function
 */
export function useProEarningsRealtime(
  proUserId: string | null
): UseProEarningsRealtimeResult {
  const [earnings, setEarnings] = useState<EarningsSummary | null>(null);
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
          logErr('Error fetching pro ID for earnings:', proError);
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

  // Fetch earnings summary
  const fetchEarnings = useCallback(async () => {
    if (!proUserId) {
      setEarnings(null);
      setLoading(false);
      return;
    }

    try {
      setError(null);
      const { data: userData } = await supabase.auth.getUser();
      const user = userData.user;
      if (!user) {
        setEarnings(null);
        setLoading(false);
        return;
      }
      const data = await getProEarnings(user.id);
      setEarnings(data);
    } catch (err) {
      logErr('Error fetching pro earnings:', err);
      setError('Failed to load earnings');
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
      setEarnings(null);
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
        setEarnings(null);
        setProId(null);
        setLoading(false);
        return;
      }
      if (!proUserId || !isMounted) return;

      setProId(resolvedProId);

      // Initial fetch
      await fetchEarnings();

      // Check if Supabase is configured before setting up subscription
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
      
      if (!supabaseUrl || !supabaseAnonKey) {
        // Supabase not configured - skip realtime subscription for UI-only mode
        setLoading(false);
        return;
      }

      try {
        // Subscribe to realtime changes for this pro's earnings
        const channel = supabase
          .channel(`pro-earnings-${resolvedProId}`)
          .on(
            'postgres_changes',
            {
              event: 'INSERT',
              schema: 'public',
              table: 'pro_earnings',
              filter: `pro_id=eq.${resolvedProId}`,
            },
            async (payload) => {
              console.log('New earning received:', payload);
              const newEarning = payload.new as { amount: number };
              
              // Optimistically update the earnings totals
              setEarnings((prev) => {
              if (!prev) return prev;
              return {
                ...prev,
                totalEarnings: prev.totalEarnings + newEarning.amount,
                thisMonth: prev.thisMonth + newEarning.amount,
                completedJobs: prev.completedJobs + 1,
              };
            });
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'pro_earnings',
            filter: `pro_id=eq.${resolvedProId}`,
          },
          async () => {
            // For updates, just refetch to avoid complex diff logic
            console.log('Earning updated, refetching...');
            await fetchEarnings();
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'DELETE',
            schema: 'public',
            table: 'pro_earnings',
            filter: `pro_id=eq.${resolvedProId}`,
          },
          async () => {
            // For deletes, just refetch to avoid complex diff logic
            console.log('Earning deleted, refetching...');
            await fetchEarnings();
          }
        )
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            console.log('Subscribed to pro earnings realtime');
          } else if (status === 'CHANNEL_ERROR') {
            console.error('Error subscribing to pro earnings');
            setError('Failed to connect to earnings updates');
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
          console.log('Unsubscribing from pro earnings realtime');
          supabase.removeChannel(channelRef.current);
          channelRef.current = null;
        } catch (err) {
          // Ignore errors when cleaning up if Supabase isn't available
        }
      }
    };
  }, [proUserId, fetchProId, fetchEarnings]);

  return {
    earnings,
    loading,
    error,
    refetch: fetchEarnings,
  };
}

// ============================================
// BONUS: Hook for booking status changes affecting earnings
// ============================================

/**
 * This hook can also listen to booking status changes to 'completed'
 * which might trigger earnings updates. Useful if you want to show
 * the earnings updating when a job is marked complete.
 * 
 * For now, we keep it simple and just subscribe to pro_earnings directly.
 * If you need booking-completion-triggered updates, you can add:
 * 
 * .on('postgres_changes', {
 *   event: 'UPDATE',
 *   schema: 'public', 
 *   table: 'bookings',
 *   filter: `pro_id=eq.${proId}`,
 * }, (payload) => {
 *   if (payload.new.status === 'completed') {
 *     refetchEarnings();
 *   }
 * })
 */




