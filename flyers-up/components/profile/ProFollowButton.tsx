'use client';

import { useCallback, useEffect, useState } from 'react';

export function ProFollowButton({ proId }: { proId: string }) {
  const [ready, setReady] = useState(false);
  const [following, setFollowing] = useState(false);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch(`/api/customer/pros/${encodeURIComponent(proId)}/follow`, {
        credentials: 'include',
      });
      if (!res.ok) {
        setFollowing(false);
        return;
      }
      const j = (await res.json()) as { following?: boolean };
      setFollowing(Boolean(j.following));
    } catch {
      setFollowing(false);
    } finally {
      setReady(true);
    }
  }, [proId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const toggle = async () => {
    if (busy) return;
    setBusy(true);
    try {
      if (following) {
        const res = await fetch(`/api/customer/pros/${encodeURIComponent(proId)}/follow`, {
          method: 'DELETE',
          credentials: 'include',
        });
        if (res.ok) setFollowing(false);
      } else {
        const res = await fetch(`/api/customer/pros/${encodeURIComponent(proId)}/follow`, {
          method: 'POST',
          credentials: 'include',
        });
        if (res.ok) setFollowing(true);
      }
    } finally {
      setBusy(false);
    }
  };

  if (!ready) {
    return (
      <div className="h-10 rounded-xl bg-black/5 animate-pulse" aria-hidden />
    );
  }

  return (
    <button
      type="button"
      onClick={() => void toggle()}
      disabled={busy}
      className={`w-full sm:w-auto min-h-[44px] px-4 rounded-xl text-sm font-semibold border transition-colors ${
        following
          ? 'border-black/15 bg-[#F5F5F5] text-[#111] hover:bg-black/5'
          : 'border-accent bg-accent text-white hover:opacity-95'
      } disabled:opacity-60`}
    >
      {busy ? '…' : following ? 'Following' : 'Follow'}
    </button>
  );
}
