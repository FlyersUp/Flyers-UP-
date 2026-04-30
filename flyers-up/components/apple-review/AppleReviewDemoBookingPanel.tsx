'use client';

/**
 * Apple Review Demo Mode (reviewer@flyersup.app only)
 * Manual progression for job tracking without a real pro in the loop.
 */
import { useCallback, useState } from 'react';

export function AppleReviewDemoBookingPanel({
  bookingId,
  status,
  onProgressed,
}: {
  bookingId: string;
  status: string;
  onProgressed: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const advance = useCallback(async () => {
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch('/api/apple-review/demo-booking-step', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ bookingId }),
      });
      const j = (await res.json()) as { ok?: boolean; error?: string; status?: string };
      if (!res.ok || !j.ok) {
        setErr(j.error ?? 'Could not advance demo');
        return;
      }
      onProgressed();
    } catch {
      setErr('Network error');
    } finally {
      setBusy(false);
    }
  }, [bookingId, onProgressed]);

  const terminal = status === 'completed' || status === 'paid' || status === 'cancelled';
  if (terminal) {
    return (
      <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50/90 px-4 py-3 text-sm text-emerald-950 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-100">
        App Store review demo: this job has reached a terminal state ({status}).
      </div>
    );
  }

  return (
    <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50/95 px-4 py-3 text-sm text-amber-950 dark:border-amber-800 dark:bg-amber-950/35 dark:text-amber-100">
      <p className="font-semibold">App Store review — demo job controls</p>
      <p className="mt-1 text-xs opacity-90">
        Current status: <span className="font-mono">{status}</span>. Use the button to simulate the pro moving through deposit, en route, in progress, and completed — no real pro action required.
      </p>
      {err ? <p className="mt-2 text-xs text-red-700 dark:text-red-300">{err}</p> : null}
      <button
        type="button"
        disabled={busy}
        onClick={() => void advance()}
        className="mt-3 w-full sm:w-auto rounded-xl bg-amber-600 px-4 py-2.5 text-sm font-semibold text-white hover:opacity-95 disabled:opacity-50"
      >
        {busy ? 'Updating…' : 'Simulate next step'}
      </button>
    </div>
  );
}
