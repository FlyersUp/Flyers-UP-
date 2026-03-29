'use client';

import { useCallback, useEffect, useState } from 'react';
import { cn } from '@/lib/cn';
import type { BookingProgressSummary } from '@/lib/bookings/milestone-workflow';

type ProgressResponse = {
  summary: BookingProgressSummary;
  events: Array<{ event_type: string; created_at: string }>;
};

export function MultiDayBookingProgressSection({
  bookingId,
  mode,
  revision = 0,
}: {
  bookingId: string;
  mode: 'customer' | 'pro';
  /** Increment after external edits (e.g. milestone plan save) to refetch. */
  revision?: number;
}) {
  const [data, setData] = useState<ProgressResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/bookings/${bookingId}/progress`, { credentials: 'include' });
      const json = (await res.json()) as ProgressResponse & { error?: string };
      if (!res.ok) {
        setError(json.error ?? 'Could not load progress');
        setData(null);
        return;
      }
      setData(json);
    } catch {
      setError('Network error');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [bookingId]);

  useEffect(() => {
    void load();
  }, [load, revision]);

  if (loading) {
    return (
      <section className="mb-6 rounded-2xl border border-border bg-[hsl(var(--card-neutral))] px-4 py-4">
        <p className="text-sm text-muted">Loading job progress…</p>
      </section>
    );
  }

  if (error) {
    return (
      <section className="mb-6 rounded-2xl border border-border bg-[hsl(var(--card-neutral))] px-4 py-4">
        <p className="text-sm text-amber-800 dark:text-amber-200 mb-2">{error}</p>
        <button
          type="button"
          onClick={() => void load()}
          className="text-sm font-medium text-[hsl(var(--accent-customer))] underline"
        >
          Retry
        </button>
      </section>
    );
  }

  if (!data?.summary) return null;

  const { summary } = data;
  if (!summary.isMultiDay && summary.milestones.length === 0) return null;

  const fmt = (iso: string | null) =>
    iso
      ? new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
      : '—';

  async function postJson(url: string, body?: Record<string, unknown>) {
    setBusy(url);
    try {
      const res = await fetch(url, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: body ? JSON.stringify(body) : '{}',
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError((j as { error?: string }).error ?? 'Request failed');
        return;
      }
      await load();
    } finally {
      setBusy(null);
    }
  }

  return (
    <section
      className={cn(
        'mb-6 rounded-2xl border border-border bg-[hsl(var(--card-neutral))] px-4 py-4 shadow-[var(--shadow-card)]'
      )}
    >
      <h2 className="text-sm font-semibold text-foreground mb-3">Multi-day progress</h2>
      {summary.bookingDisputeOpen && (
        <p className="text-sm text-amber-700 dark:text-amber-300 mb-3">A dispute is open — payout stays blocked until resolved.</p>
      )}
      <ul className="space-y-3">
        {summary.milestones.map((m) => (
          <li
            key={m.index}
            className="rounded-xl border border-border bg-surface2/60 px-3 py-3 text-sm"
          >
            <div className="flex justify-between gap-2">
              <span className="font-medium text-foreground">
                {m.index + 1}. {m.title}
              </span>
              <span className="text-muted capitalize whitespace-nowrap">{m.status.replace(/_/g, ' ')}</span>
            </div>
            {m.description ? <p className="text-muted text-xs mt-1">{m.description}</p> : null}
            {m.proofPhotos.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {m.proofPhotos.slice(0, 4).map((url) => (
                  <a
                    key={url}
                    href={url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs text-[hsl(var(--accent-customer))] underline truncate max-w-[8rem]"
                  >
                    Photo
                  </a>
                ))}
              </div>
            )}
            {m.status === 'completed_pending_confirmation' && m.confirmationDueAt && (
              <p className="text-xs text-muted mt-2">Auto-confirms on {fmt(m.confirmationDueAt)} if you take no action.</p>
            )}
            {(m.status === 'confirmed' || m.status === 'auto_confirmed') && m.confirmedAt && (
              <p className="text-xs text-muted mt-2">
                Confirmed {fmt(m.confirmedAt)}
                {m.confirmationSource ? ` · ${m.confirmationSource === 'auto' ? 'Auto-confirmed' : 'You confirmed'}` : ''}
              </p>
            )}
            {mode === 'customer' && m.status === 'completed_pending_confirmation' && !m.disputeOpen && (
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={busy !== null}
                  onClick={() =>
                    void postJson(`/api/bookings/${bookingId}/milestones/${m.index}/confirm`)
                  }
                  className="rounded-full bg-[hsl(var(--accent-customer))] text-black px-4 py-2 text-xs font-semibold disabled:opacity-50"
                >
                  Confirm milestone
                </button>
                <button
                  type="button"
                  disabled={busy !== null}
                  onClick={() => {
                    const reason = window.prompt('Briefly describe the issue (optional)') ?? '';
                    void postJson(`/api/bookings/${bookingId}/milestones/${m.index}/dispute`, {
                      reason: reason || undefined,
                    });
                  }}
                  className="rounded-full border border-border px-4 py-2 text-xs font-medium text-foreground disabled:opacity-50"
                >
                  Report issue
                </button>
              </div>
            )}
            {mode === 'pro' && (
              <ProMilestoneActions
                bookingId={bookingId}
                milestoneIndex={m.index}
                status={m.status}
                busy={busy}
                onDone={() => void load()}
                onError={setError}
                setBusy={setBusy}
              />
            )}
          </li>
        ))}
      </ul>

      {summary.final.requestedAt && (
        <div className="mt-4 pt-3 border-t border-border text-sm">
          <p className="font-medium text-foreground">Final completion</p>
          <p className="text-xs text-muted mt-1">Requested {fmt(summary.final.requestedAt)}</p>
          {summary.final.confirmedAt ? (
            <p className="text-xs text-muted mt-1">
              Confirmed {fmt(summary.final.confirmedAt)}
              {summary.final.confirmationSource
                ? ` · ${summary.final.confirmationSource === 'auto' ? 'Auto' : 'Customer'}`
                : ''}
            </p>
          ) : summary.final.autoConfirmAt ? (
            <p className="text-xs text-muted mt-1">Booking auto-confirm window ends {fmt(summary.final.autoConfirmAt)}</p>
          ) : null}
        </div>
      )}

      {error ? <p className="text-xs text-red-600 mt-3">{error}</p> : null}
    </section>
  );
}

function ProMilestoneActions({
  bookingId,
  milestoneIndex,
  status,
  busy,
  onDone,
  onError,
  setBusy,
}: {
  bookingId: string;
  milestoneIndex: number;
  status: string;
  busy: string | null;
  onDone: () => void;
  onError: (s: string) => void;
  setBusy: (s: string | null) => void;
}) {
  const [proofInput, setProofInput] = useState('');

  async function post(url: string, body?: Record<string, unknown>) {
    setBusy(url);
    onError('');
    try {
      const res = await fetch(url, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body ?? {}),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        onError((j as { error?: string }).error ?? 'Request failed');
        return;
      }
      onDone();
      setProofInput('');
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="mt-3 space-y-2">
      {status === 'pending' && (
        <button
          type="button"
          disabled={busy !== null}
          onClick={() => void post(`/api/bookings/${bookingId}/milestones/${milestoneIndex}/start`)}
          className="rounded-full bg-[hsl(var(--accent-pro))] text-[hsl(var(--accent-contrast))] px-3 py-1.5 text-xs font-semibold disabled:opacity-50"
        >
          Start milestone
        </button>
      )}
      {status === 'in_progress' && (
        <div className="space-y-2">
          <label className="block text-xs text-muted">Proof photo URLs (one per line)</label>
          <textarea
            value={proofInput}
            onChange={(e) => setProofInput(e.target.value)}
            rows={2}
            className="w-full rounded-lg border border-border bg-background text-xs p-2"
            placeholder="https://…"
          />
          <button
            type="button"
            disabled={busy !== null}
            onClick={() => {
              const urls = proofInput
                .split('\n')
                .map((s) => s.trim())
                .filter(Boolean);
              void post(`/api/bookings/${bookingId}/milestones/${milestoneIndex}/complete`, {
                proof_photos: urls,
              });
            }}
            className="rounded-full border border-border px-3 py-1.5 text-xs font-medium disabled:opacity-50"
          >
            Mark milestone complete
          </button>
        </div>
      )}
    </div>
  );
}
