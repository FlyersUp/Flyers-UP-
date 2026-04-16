'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useState } from 'react';
import type { AssignableReconciliationAdmin } from '@/lib/bookings/money-reconciliation-queue';

type Props = {
  bookingId: string;
  assignedToUserId: string | null;
  lastReviewedAt: string | null;
  opsNote: string | null;
  assignableAdmins: AssignableReconciliationAdmin[];
};

export function MoneyReconciliationQueueControls({
  bookingId,
  assignedToUserId,
  lastReviewedAt,
  opsNote,
  assignableAdmins,
}: Props) {
  const router = useRouter();
  const [noteDraft, setNoteDraft] = useState(opsNote ?? '');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const save = useCallback(
    async (patch: Record<string, unknown>) => {
      setBusy(true);
      setErr(null);
      try {
        const res = await fetch(`/api/admin/reconciliation/ops/${bookingId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(patch),
        });
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        if (!res.ok) {
          setErr(j.error ?? `Save failed (${res.status})`);
          return;
        }
        router.refresh();
      } catch {
        setErr('Network error');
      } finally {
        setBusy(false);
      }
    },
    [bookingId, router]
  );

  return (
    <div className="min-w-[200px] space-y-2 text-xs">
      <div className="flex flex-wrap items-center gap-1">
        <span className="text-muted">Owner</span>
        <select
          id={`recon-owner-${bookingId}`}
          aria-label="Assign owner"
          className="max-w-[160px] rounded border border-hairline bg-surface px-1.5 py-1 text-xs text-text"
          disabled={busy}
          value={assignedToUserId ?? ''}
          onChange={(e) => {
            const v = e.target.value;
            void save({ assigned_to: v === '' ? null : v });
          }}
        >
          <option value="">Unassigned</option>
          {assignableAdmins.map((a) => (
            <option key={a.id} value={a.id}>
              {a.label}
            </option>
          ))}
        </select>
      </div>
      <div className="flex flex-wrap items-center gap-1">
        <button
          type="button"
          disabled={busy}
          onClick={() => void save({ mark_reviewed: true })}
          className="rounded border border-hairline bg-surface2 px-2 py-1 font-medium hover:bg-surface disabled:opacity-50"
        >
          Mark reviewed
        </button>
        {lastReviewedAt ? (
          <span className="text-muted tabular-nums" title={lastReviewedAt}>
            {lastReviewedAt.slice(0, 10)}
          </span>
        ) : (
          <span className="text-muted">Never</span>
        )}
      </div>
      <div className="space-y-1">
        <textarea
          className="w-full min-h-[52px] max-w-[220px] rounded border border-hairline bg-surface px-2 py-1 text-xs text-text"
          placeholder="Ops note…"
          disabled={busy}
          value={noteDraft}
          onChange={(e) => setNoteDraft(e.target.value)}
          rows={2}
        />
        <button
          type="button"
          disabled={busy}
          onClick={() => void save({ ops_note: noteDraft.trim() === '' ? null : noteDraft })}
          className="rounded border border-accent/40 bg-surface2 px-2 py-1 text-[11px] font-semibold text-accent hover:bg-surface disabled:opacity-50"
        >
          Save note
        </button>
      </div>
      {err ? <p className="text-rose-700">{err}</p> : null}
    </div>
  );
}
