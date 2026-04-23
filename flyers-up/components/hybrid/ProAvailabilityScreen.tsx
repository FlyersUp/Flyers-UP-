'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { AdminPageShell } from '@/components/hybrid/AdminPageShell';
import { ProAvailabilityTable } from '@/components/hybrid/ProAvailabilityTable';
import type { ProAvailabilityRow } from '@/lib/hybrid-ui/types';
import { MOCK_PRO_AVAILABILITY } from '@/lib/hybrid-ui/mock-data';
import { cn } from '@/lib/cn';

const TOOLBAR = ['Full-time', 'All pros', 'In service', 'Brooklyn only', 'Top rated'] as const;

export function ProAvailabilityScreen({ initialRows }: { initialRows?: ProAvailabilityRow[] }) {
  const [rows, setRows] = useState<ProAvailabilityRow[]>(initialRows ?? MOCK_PRO_AVAILABILITY);
  const [filters, setFilters] = useState<Set<string>>(new Set());
  const [pendingIds, setPendingIds] = useState<Set<string>>(new Set());
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [saveError, setSaveError] = useState<string | null>(null);
  const savedTimersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  useEffect(() => {
    const timers = savedTimersRef.current;
    return () => {
      for (const t of timers.values()) clearTimeout(t);
      timers.clear();
    };
  }, []);

  const flashSaved = (id: string) => {
    const prev = savedTimersRef.current.get(id);
    if (prev) clearTimeout(prev);
    setSavedIds((s) => new Set(s).add(id));
    const t = setTimeout(() => {
      setSavedIds((s) => {
        const next = new Set(s);
        next.delete(id);
        return next;
      });
      savedTimersRef.current.delete(id);
    }, 2500);
    savedTimersRef.current.set(id, t);
  };

  const filtered = useMemo(() => {
    let out = rows;
    if (filters.has('Brooklyn only')) out = out.filter((r) => r.borough === 'Brooklyn');
    if (filters.has('Top rated')) out = out.filter((r) => r.verified);
    if (filters.has('In service')) out = out.filter((r) => r.matchable);
    return out;
  }, [rows, filters]);

  const toggle = (f: string) => {
    setFilters((prev) => {
      const n = new Set(prev);
      if (n.has(f)) n.delete(f);
      else n.add(f);
      return n;
    });
  };

  const recomputeMatchable = (r: ProAvailabilityRow, activeThisWeek: boolean, paused: boolean): boolean =>
    !paused && activeThisWeek && r.verified;

  const setActiveWeek = (id: string, value: boolean) => {
    void updateRow(id, { activeThisWeek: value });
  };

  const setPaused = (id: string, value: boolean) => {
    void updateRow(id, { paused: value });
  };

  const applyPatch = (source: ProAvailabilityRow[], id: string, patch: { activeThisWeek?: boolean; paused?: boolean }) =>
    source.map((r) => {
      if (r.id !== id) return r;
      const activeThisWeek = patch.activeThisWeek ?? r.activeThisWeek;
      const paused = patch.paused ?? r.paused;
      return {
        ...r,
        activeThisWeek,
        paused,
        matchable: recomputeMatchable(r, activeThisWeek, paused),
      };
    });

  const updateRow = async (id: string, patch: { activeThisWeek?: boolean; paused?: boolean }) => {
    const previous = rows.find((r) => r.id === id);
    if (!previous) return;

    setSaveError(null);
    const existingSavedTimer = savedTimersRef.current.get(id);
    if (existingSavedTimer) clearTimeout(existingSavedTimer);
    savedTimersRef.current.delete(id);
    setSavedIds((s) => {
      const next = new Set(s);
      next.delete(id);
      return next;
    });
    setPendingIds((prev) => new Set(prev).add(id));
    setRows((prev) => applyPatch(prev, id, patch));

    try {
      const res = await fetch(`/api/admin/hybrid/pro-availability/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(body?.error || 'Failed to save availability change');
      }
      flashSaved(id);
    } catch (err) {
      console.error('[pro-availability] toggle update failed', err);
      setRows((prev) => prev.map((r) => (r.id === id ? previous : r)));
      setSaveError('Could not save availability update. The row was restored.');
    } finally {
      setPendingIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  };

  return (
    <AdminPageShell
      title="Pro Availability"
      subtitle="Operational view of who is matchable, paused, and active this week — sync toggles to `service_pros` when ready."
      filters={
        <div className="flex flex-wrap items-center gap-2">
          {TOOLBAR.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => toggle(t)}
              className={cn(
                'rounded-full border px-3 py-1.5 text-xs font-semibold',
                filters.has(t)
                  ? 'border-[hsl(var(--trust))] bg-[hsl(222_44%_96%)] text-[hsl(var(--trust))]'
                  : 'border-border bg-surface text-text-2 hover:bg-surface2'
              )}
            >
              {t}
            </button>
          ))}
          <button
            type="button"
            className="ml-auto rounded-xl border border-border bg-surface px-3 py-2 text-xs font-semibold text-text hover:bg-surface2"
          >
            Export CSV
          </button>
        </div>
      }
    >
      {saveError ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{saveError}</div>
      ) : null}
      <ProAvailabilityTable
        rows={filtered}
        onToggleActiveWeek={setActiveWeek}
        onTogglePaused={setPaused}
        pendingIds={pendingIds}
        savedIds={savedIds}
      />
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <div className="rounded-2xl border border-border bg-surface p-4 text-sm shadow-[var(--shadow-sm)]">
          <p className="text-xs font-bold uppercase tracking-wide text-text-3">Weekly automations</p>
          <p className="mt-2 text-text-2">Gate refresh + reminder pings (placeholder).</p>
        </div>
        <div className="rounded-2xl border border-border bg-surface p-4 text-sm shadow-[var(--shadow-sm)]">
          <p className="text-xs font-bold uppercase tracking-wide text-text-3">Pending reactivations</p>
          <p className="mt-2 font-semibold text-[hsl(var(--trust))]">3 pros</p>
        </div>
        <div className="rounded-2xl border border-emerald-100 bg-emerald-50/60 p-4 text-sm shadow-[var(--shadow-sm)]">
          <p className="text-xs font-bold uppercase tracking-wide text-emerald-900">Network health</p>
          <p className="mt-2 text-2xl font-bold text-emerald-800">92%</p>
        </div>
      </div>
    </AdminPageShell>
  );
}
