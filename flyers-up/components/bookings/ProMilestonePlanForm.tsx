'use client';

import { useCallback, useEffect, useState } from 'react';
import { cn } from '@/lib/cn';
import { canProEditMilestonePlan } from '@/lib/bookings/milestone-plan-constants';
import type { BookingProgressSummary } from '@/lib/bookings/milestone-workflow';

type ProgressResponse = {
  summary: BookingProgressSummary;
  events?: unknown[];
};

type Row = { title: string; description: string; amountDollars: string };

function emptyRow(): Row {
  return { title: '', description: '', amountDollars: '' };
}

function dollarsToCents(raw: string): number | null {
  const t = raw.trim();
  if (!t) return 0;
  const n = Number.parseFloat(t.replace(/,/g, ''));
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.round(n * 100);
}

function centsToDollarsField(cents: number): string {
  if (!cents) return '';
  const d = cents / 100;
  if (Number.isInteger(d)) return String(d);
  return d.toFixed(2).replace(/0+$/, '').replace(/\.$/, '');
}

export function ProMilestonePlanForm({
  bookingId,
  bookingStatus,
  reloadKey = 0,
  onSaved,
}: {
  bookingId: string;
  bookingStatus: string;
  reloadKey?: number;
  onSaved?: () => void;
}) {
  const [rows, setRows] = useState<Row[]>([emptyRow()]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [show, setShow] = useState(false);

  const load = useCallback(async () => {
    if (!canProEditMilestonePlan(bookingStatus)) {
      setShow(false);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/bookings/${bookingId}/progress`, { credentials: 'include' });
      const json = (await res.json()) as ProgressResponse & { error?: string };
      if (!res.ok) {
        setShow(false);
        setError(json.error ?? 'Could not load progress');
        return;
      }
      const ms = json.summary?.milestones ?? [];
      const planLocked = ms.some((m) => m.status !== 'pending');
      const editable = !planLocked;
      setShow(editable);
      if (editable) {
        if (ms.length > 0) {
          setRows(
            ms.map((m) => ({
              title: m.title,
              description: m.description ?? '',
              amountDollars: centsToDollarsField(m.amountCents),
            }))
          );
        } else {
          setRows([emptyRow()]);
        }
      }
    } catch {
      setShow(false);
      setError('Network error');
    } finally {
      setLoading(false);
    }
  }, [bookingId, bookingStatus]);

  useEffect(() => {
    void load();
  }, [load, reloadKey]);

  if (!canProEditMilestonePlan(bookingStatus)) return null;
  if (loading) {
    return (
      <section className="mb-6 rounded-2xl border border-border bg-[hsl(var(--card-neutral))] px-4 py-4">
        <p className="text-sm text-muted">Loading milestone plan…</p>
      </section>
    );
  }
  if (!show) return null;

  function updateRow(i: number, patch: Partial<Row>) {
    setRows((prev) => prev.map((r, j) => (j === i ? { ...r, ...patch } : r)));
  }

  function addRow() {
    setRows((prev) => [...prev, emptyRow()].slice(0, 20));
  }

  function removeRow(i: number) {
    setRows((prev) => {
      const next = prev.filter((_, j) => j !== i);
      return next.length > 0 ? next : [emptyRow()];
    });
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    const milestones: { title: string; description?: string | null; amount_cents: number }[] = [];
    for (const r of rows) {
      const title = r.title.trim();
      if (!title) continue;
      const cents = dollarsToCents(r.amountDollars);
      if (cents === null) {
        setError('Each amount must be a valid non-negative number');
        setSaving(false);
        return;
      }
      milestones.push({
        title,
        description: r.description.trim() || null,
        amount_cents: cents,
      });
    }
    if (milestones.length > 20) {
      setError('At most 20 milestones');
      setSaving(false);
      return;
    }
    try {
      const res = await fetch(`/api/bookings/${bookingId}/milestones`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ milestones }),
      });
      const j = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setError(j.error ?? 'Save failed');
        return;
      }
      onSaved?.();
      await load();
    } catch {
      setError('Network error');
    } finally {
      setSaving(false);
    }
  }

  return (
    <section
      className={cn(
        'mb-6 rounded-2xl border border-border bg-[hsl(var(--card-neutral))] px-4 py-4 shadow-[var(--shadow-card)]'
      )}
    >
      <h2 className="text-sm font-semibold text-foreground mb-1">Milestone plan</h2>
      <p className="text-xs text-muted mb-4">
        Define phases before work starts. You can edit until the first milestone is started. Leave amounts blank for $0.
      </p>

      <ul className="space-y-3">
        {rows.map((r, i) => (
          <li
            key={i}
            className="rounded-xl border border-border bg-surface2/60 px-3 py-3 space-y-2"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-medium text-muted">Milestone {i + 1}</span>
              {rows.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeRow(i)}
                  className="text-xs text-muted hover:text-foreground underline"
                >
                  Remove
                </button>
              )}
            </div>
            <label className="block text-xs text-muted">Title</label>
            <input
              value={r.title}
              onChange={(e) => updateRow(i, { title: e.target.value })}
              className="w-full rounded-lg border border-border bg-background text-sm px-2 py-1.5"
              placeholder="e.g. Demolition"
            />
            <label className="block text-xs text-muted">Description (optional)</label>
            <input
              value={r.description}
              onChange={(e) => updateRow(i, { description: e.target.value })}
              className="w-full rounded-lg border border-border bg-background text-sm px-2 py-1.5"
              placeholder="Details for the customer"
            />
            <label className="block text-xs text-muted">Amount (optional, USD)</label>
            <input
              value={r.amountDollars}
              onChange={(e) => updateRow(i, { amountDollars: e.target.value })}
              className="w-full max-w-[12rem] rounded-lg border border-border bg-background text-sm px-2 py-1.5"
              placeholder="0"
              inputMode="decimal"
            />
          </li>
        ))}
      </ul>

      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          disabled={rows.length >= 20 || saving}
          onClick={() => addRow()}
          className="rounded-full border border-border px-3 py-1.5 text-xs font-medium disabled:opacity-50"
        >
          Add milestone
        </button>
        <button
          type="button"
          disabled={saving}
          onClick={() => void handleSave()}
          className="rounded-full bg-[hsl(var(--accent-pro))] text-[hsl(var(--accent-contrast))] px-4 py-1.5 text-xs font-semibold disabled:opacity-50"
        >
          {saving ? 'Saving…' : 'Save plan'}
        </button>
      </div>

      {error ? <p className="text-xs text-red-600 mt-3">{error}</p> : null}
    </section>
  );
}
