'use client';

import { useState } from 'react';

type Props = {
  bookingId: string;
  clawbackStatus: string;
  recoveryStatus: string;
};

export function RefundRemediationAdminPanel({ bookingId, clawbackStatus, recoveryStatus }: Props) {
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  if (clawbackStatus !== 'open') {
    return (
      <p className="text-xs text-muted">
        Pro clawback remediation: <span className="font-mono">{clawbackStatus}</span> · Stripe outbound recovery:{' '}
        <span className="font-mono">{recoveryStatus}</span>
      </p>
    );
  }

  async function submit(action: 'resolve' | 'waive') {
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch(`/api/admin/bookings/${bookingId}/refund-remediation`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ action, internalNote: note.trim() || undefined }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setMsg(data.error ?? `HTTP ${res.status}`);
        return;
      }
      setMsg(action === 'waive' ? 'Marked waived.' : 'Marked resolved.');
      window.location.reload();
    } catch {
      setMsg('Request failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-2">
      <p className="text-xs text-amber-800/90 dark:text-amber-200/90">
        Open remediation: recover pro-side funds / record transfer reversal offline. Customer refund is already
        processed.
      </p>
      <textarea
        className="w-full min-h-[72px] rounded-lg border border-hairline bg-surface px-3 py-2 text-sm"
        placeholder="Internal note (optional)"
        value={note}
        onChange={(e) => setNote(e.target.value)}
        disabled={busy}
      />
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className="rounded-lg border border-hairline bg-surface2 px-3 py-1.5 text-sm font-medium hover:bg-surface"
          disabled={busy}
          onClick={() => void submit('resolve')}
        >
          Mark clawback resolved
        </button>
        <button
          type="button"
          className="rounded-lg border border-hairline px-3 py-1.5 text-sm text-muted hover:bg-surface2"
          disabled={busy}
          onClick={() => void submit('waive')}
        >
          Waive recovery
        </button>
      </div>
      {msg ? <p className="text-xs text-muted">{msg}</p> : null}
    </div>
  );
}
