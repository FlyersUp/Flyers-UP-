'use client';

import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

export type YouBlockedOtherUserState = {
  youBlocked: boolean;
  loading: boolean;
  block: () => Promise<boolean>;
  unblock: () => Promise<boolean>;
  refetch: () => Promise<void>;
};

/**
 * True when the current user has blocked `otherUserId` (blocker → blocked).
 * Does not detect the reverse (other user blocked you); RLS only exposes own blocks.
 * Source of truth: `blocked_users` (blocker_id, blocked_user_id), same as POST/DELETE /api/users/block.
 */
export function useYouBlockedOtherUser(otherUserId: string | null): YouBlockedOtherUserState {
  const [youBlocked, setYouBlocked] = useState(false);
  const [loading, setLoading] = useState(false);

  const refetch = useCallback(async () => {
    if (!otherUserId) {
      setYouBlocked(false);
      return;
    }
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setYouBlocked(false);
      return;
    }
    const { data } = await supabase
      .from('blocked_users')
      .select('id')
      .eq('blocker_id', user.id)
      .eq('blocked_user_id', otherUserId)
      .maybeSingle();
    setYouBlocked(Boolean(data));
  }, [otherUserId]);

  useEffect(() => {
    if (!otherUserId) {
      setYouBlocked(false);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    void (async () => {
      await refetch();
      if (!cancelled) setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [otherUserId, refetch]);

  const unblock = useCallback(async () => {
    if (!otherUserId) return false;
    const res = await fetch(`/api/users/block?blockedUserId=${encodeURIComponent(otherUserId)}`, {
      method: 'DELETE',
      credentials: 'include',
    });
    if (res.ok) setYouBlocked(false);
    return res.ok;
  }, [otherUserId]);

  const block = useCallback(async () => {
    if (!otherUserId) return false;
    const res = await fetch('/api/users/block', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ blockedUserId: otherUserId }),
    });
    if (res.ok) setYouBlocked(true);
    return res.ok;
  }, [otherUserId]);

  return { youBlocked, loading, unblock, block, refetch };
}
