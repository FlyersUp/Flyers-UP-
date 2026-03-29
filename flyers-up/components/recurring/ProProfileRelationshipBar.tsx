'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

type Meta = {
  isFavorited: boolean;
  proMarkedPreferred: boolean;
  mutualPreference: boolean;
  proBlockedRecurring: boolean;
  hasCompletedBooking: boolean;
};

export function ProProfileRelationshipBar({ proId }: { proId: string }) {
  const [meta, setMeta] = useState<Meta | null>(null);
  const [busy, setBusy] = useState(false);

  function load() {
    return fetch(`/api/customer/pros/${encodeURIComponent(proId)}/meta`, { credentials: 'include' })
      .then((r) => r.json())
      .then((j) => {
        if (!j.ok) return;
        setMeta({
          isFavorited: j.isFavorited,
          proMarkedPreferred: j.proMarkedPreferred,
          mutualPreference: j.mutualPreference,
          proBlockedRecurring: j.proBlockedRecurring,
          hasCompletedBooking: j.hasCompletedBooking,
        });
      })
      .catch(() => {});
  }

  useEffect(() => {
    void load();
  }, [proId]);

  async function toggleFavorite() {
    if (!meta) return;
    setBusy(true);
    try {
      const nextFav = !meta.isFavorited;
      const res = await fetch(`/api/customer/pros/${encodeURIComponent(proId)}/favorite`, {
        method: nextFav ? 'POST' : 'DELETE',
        credentials: 'include',
      });
      if (res.ok) {
        setMeta({
          ...meta,
          isFavorited: nextFav,
          mutualPreference: nextFav && meta.proMarkedPreferred && !meta.proBlockedRecurring,
        });
      }
    } finally {
      setBusy(false);
    }
  }

  if (!meta) return <div className="h-10 rounded-xl bg-black/5 animate-pulse" />;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        disabled={busy}
        onClick={() => void toggleFavorite()}
        className="rounded-full border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-surface2/80 disabled:opacity-50"
      >
        {meta.isFavorited ? '★ Favorited' : '☆ Favorite Pro'}
      </button>
      {meta.mutualPreference && (
        <span className="rounded-full bg-emerald-100 text-emerald-900 dark:bg-emerald-900/40 dark:text-emerald-100 px-3 py-1 text-xs font-semibold">
          Mutual Match
        </span>
      )}
      {meta.proMarkedPreferred && (
        <span className="rounded-full bg-[hsl(var(--accent-pro))]/15 text-text px-3 py-1 text-xs font-medium">
          Preferred Client
        </span>
      )}
      {meta.hasCompletedBooking && (
        <Link
          href={`/book/${encodeURIComponent(proId)}`}
          className="rounded-full bg-[hsl(var(--accent-customer))] text-black px-4 py-2 text-sm font-semibold"
        >
          Book again
        </Link>
      )}
      <Link
        href={`/customer/recurring/new?proId=${encodeURIComponent(proId)}`}
        className="rounded-full border border-border px-4 py-2 text-sm font-medium text-foreground"
      >
        Request recurring
      </Link>
      {meta.proBlockedRecurring && (
        <span className="text-xs text-amber-700 dark:text-amber-300">Recurring not available with this pro.</span>
      )}
    </div>
  );
}
