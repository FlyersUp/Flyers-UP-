'use client';

import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

/**
 * True when the current user has blocked `otherUserId` (blocker → blocked).
 * Does not detect the reverse (other user blocked you); RLS only exposes own blocks.
 */
export function useYouBlockedOtherUser(otherUserId: string | null) {
  const [youBlocked, setYouBlocked] = useState(false);
  const [loading, setLoading] = useState(Boolean(otherUserId));

  useEffect(() => {
    if (!otherUserId) {
      setYouBlocked(false);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    void (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user || cancelled) {
        if (!cancelled) setLoading(false);
        return;
      }
      const { data } = await supabase
        .from('blocked_users')
        .select('id')
        .eq('blocker_id', user.id)
        .eq('blocked_user_id', otherUserId)
        .maybeSingle();
      if (!cancelled) {
        setYouBlocked(Boolean(data));
        setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [otherUserId]);

  const unblock = useCallback(async () => {
    if (!otherUserId) return false;
    const res = await fetch(`/api/users/block?blockedUserId=${encodeURIComponent(otherUserId)}`, {
      method: 'DELETE',
    });
    if (res.ok) setYouBlocked(false);
    return res.ok;
  }, [otherUserId]);

  return { youBlocked, loading, unblock };
}
