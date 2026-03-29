'use client';

import { useCallback, useState } from 'react';

type Props = {
  customerUserId: string;
};

export function ProCustomerPreferenceActions({ customerUserId }: Props) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const act = useCallback(
    async (path: 'preferred' | 'standard' | 'recurring-block') => {
      setBusy(true);
      setMessage(null);
      try {
        const res = await fetch(`/api/pro/customers/${customerUserId}/${path}`, {
          method: 'POST',
          credentials: 'include',
        });
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        if (!res.ok) {
          setMessage(j.error ?? 'Something went wrong');
          return;
        }
        setMessage(
          path === 'preferred'
            ? 'Marked preferred'
            : path === 'standard'
              ? 'Reset to standard'
              : 'Recurring blocked for this customer'
        );
      } finally {
        setBusy(false);
      }
    },
    [customerUserId]
  );

  return (
    <div className="mt-3 pt-3 border-t border-border">
      <div className="text-xs font-medium text-muted mb-2">Client relationship</div>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={() => void act('preferred')}
          className="rounded-full border border-border bg-white px-3 py-1.5 text-xs font-medium text-text hover:bg-black/[0.03] disabled:opacity-50"
        >
          Preferred
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => void act('standard')}
          className="rounded-full border border-border px-3 py-1.5 text-xs font-medium text-muted hover:bg-black/[0.03] disabled:opacity-50"
        >
          Standard
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => void act('recurring-block')}
          className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-900 hover:bg-amber-100 disabled:opacity-50"
        >
          Block recurring
        </button>
      </div>
      {message && <p className="mt-2 text-xs text-muted">{message}</p>}
    </div>
  );
}
