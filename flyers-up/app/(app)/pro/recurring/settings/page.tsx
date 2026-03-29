'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { AppLayout } from '@/components/layouts/AppLayout';
import { RECURRING_FRIENDLY_OCCUPATION_SLUGS } from '@/lib/recurring/constants';

type OccToggle = { occupation_slug: string; is_enabled: boolean };

type WinRow = {
  id?: string;
  day_of_week: number;
  start_minute: number;
  end_minute: number;
  occupation_slug: string | null;
  recurring_only: boolean;
  is_flexible: boolean;
  is_active: boolean;
};

function minutesToHHMM(m: number): string {
  const h = Math.floor(m / 60);
  const min = m % 60;
  return `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
}

function parseHHMM(s: string): number | null {
  const m = s.trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return null;
  const h = parseInt(m[1]!, 10);
  const min = parseInt(m[2]!, 10);
  if (h < 0 || h > 23 || min < 0 || min > 59) return null;
  return h * 60 + min;
}

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function ProRecurringSettingsPage() {
  const [prefs, setPrefs] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);
  const [occ, setOcc] = useState<OccToggle[]>([]);
  const [occDefaults, setOccDefaults] = useState(false);
  const [windows, setWindows] = useState<WinRow[]>([]);
  const [savingOcc, setSavingOcc] = useState(false);
  const [savingWin, setSavingWin] = useState(false);
  const [newWin, setNewWin] = useState({
    day_of_week: 1,
    start: '09:00',
    end: '17:00',
    occupation_slug: '',
  });

  const loadWin = useCallback(() => {
    fetch('/api/pro/recurring/windows', { credentials: 'include' })
      .then((r) => r.json())
      .then((j) => {
        if (!j.ok) return;
        setWindows((j.windows ?? []) as WinRow[]);
      });
  }, []);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      fetch('/api/pro/recurring/preferences', { credentials: 'include' }).then((r) => r.json()),
      fetch('/api/pro/recurring/occupations', { credentials: 'include' }).then((r) => r.json()),
      fetch('/api/pro/recurring/windows', { credentials: 'include' }).then((r) => r.json()),
    ])
      .then(([p, o, w]) => {
        if (p.ok && p.preferences) setPrefs(p.preferences);
        if (o.ok) {
          setOccDefaults(Boolean(o.defaults));
          setOcc((o.occupations ?? []) as OccToggle[]);
        }
        if (w.ok) setWindows((w.windows ?? []) as WinRow[]);
      })
      .finally(() => setLoading(false));
  }, []);

  async function save(patch: Record<string, unknown>) {
    const res = await fetch('/api/pro/recurring/preferences', {
      method: 'PUT',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    });
    const j = await res.json();
    if (j.ok && j.preferences) setPrefs(j.preferences);
  }

  async function saveOccupations(next: OccToggle[]) {
    setSavingOcc(true);
    try {
      const res = await fetch('/api/pro/recurring/occupations', {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ occupations: next.map((x) => ({ occupation_slug: x.occupation_slug, is_enabled: x.is_enabled })) }),
      });
      const j = await res.json();
      if (j.ok) {
        setOccDefaults(false);
        setOcc((j.occupations ?? next) as OccToggle[]);
      }
    } finally {
      setSavingOcc(false);
    }
  }

  async function saveWindows(next: WinRow[]) {
    setSavingWin(true);
    try {
      const payload = next.map((w) => ({
        day_of_week: w.day_of_week,
        start_minute: w.start_minute,
        end_minute: w.end_minute,
        occupation_slug: w.occupation_slug || null,
        recurring_only: w.recurring_only,
        is_flexible: w.is_flexible,
        is_active: w.is_active,
      }));
      const res = await fetch('/api/pro/recurring/windows', {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ windows: payload }),
      });
      const j = await res.json();
      if (j.ok) setWindows((j.windows ?? []) as WinRow[]);
    } finally {
      setSavingWin(false);
    }
  }

  if (loading || !prefs) {
    return (
      <AppLayout mode="pro">
        <div className="max-w-xl mx-auto px-4 py-6 text-sm text-muted">Loading…</div>
      </AppLayout>
    );
  }

  return (
    <AppLayout mode="pro">
      <div className="max-w-xl mx-auto px-4 py-6 space-y-8">
        <Link href="/pro/recurring" className="text-sm text-muted hover:text-text">
          ← Recurring dashboard
        </Link>
        <h1 className="text-2xl font-semibold text-text">Recurring settings</h1>

        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-text">Policy</h2>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={prefs.recurring_enabled !== false}
              onChange={(e) => void save({ recurring_enabled: e.target.checked })}
            />
            Recurring enabled
          </label>

          <label className="block text-sm">
            <span className="text-muted">Max recurring customers</span>
            <input
              type="number"
              min={0}
              max={100}
              value={Number(prefs.max_recurring_customers ?? 5)}
              onChange={(e) => void save({ max_recurring_customers: Number(e.target.value) })}
              className="mt-1 w-full rounded-lg border border-border px-3 py-2"
            />
          </label>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={prefs.only_preferred_clients_can_request === true}
              onChange={(e) => void save({ only_preferred_clients_can_request: e.target.checked })}
            />
            Only preferred clients can request recurring
          </label>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={prefs.allow_auto_approval_for_mutual_preference === true}
              onChange={(e) => void save({ allow_auto_approval_for_mutual_preference: e.target.checked })}
            />
            Auto-approve when mutual match + open slot (still respects conflicts & windows)
          </label>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={prefs.recurring_only_windows_enabled === true}
              onChange={(e) => void save({ recurring_only_windows_enabled: e.target.checked })}
            />
            Enforce recurring-only weekly windows
          </label>
        </section>

        <section className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-sm font-semibold text-text">Allowed occupations</h2>
            <button
              type="button"
              disabled={savingOcc}
              onClick={() => void saveOccupations(occ)}
              className="text-xs rounded-full border border-border px-3 py-1 disabled:opacity-50"
            >
              Save occupations
            </button>
          </div>
          {occDefaults && <p className="text-xs text-muted">Using defaults until you save once.</p>}
          <ul className="space-y-2">
            {occ.map((o) => (
              <li key={o.occupation_slug} className="flex items-center justify-between text-sm">
                <span className="font-mono text-xs">{o.occupation_slug}</span>
                <label className="flex items-center gap-2 text-xs text-muted">
                  <input
                    type="checkbox"
                    checked={o.is_enabled}
                    onChange={() => {
                      const next = occ.map((x) =>
                        x.occupation_slug === o.occupation_slug ? { ...x, is_enabled: !x.is_enabled } : x
                      );
                      setOcc(next);
                    }}
                  />
                  Enabled
                </label>
              </li>
            ))}
          </ul>
        </section>

        <section className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-sm font-semibold text-text">Recurring-only windows</h2>
            <button
              type="button"
              disabled={savingWin}
              onClick={() => void loadWin()}
              className="text-xs text-muted underline"
            >
              Reload
            </button>
          </div>
          <p className="text-xs text-muted">Times are local minutes within each day (0:00–24:00).</p>

          <div className="flex flex-wrap gap-2 items-end text-xs">
            <label>
              Day
              <select
                className="ml-1 rounded border border-border px-2 py-1"
                value={newWin.day_of_week}
                onChange={(e) => setNewWin((n) => ({ ...n, day_of_week: Number(e.target.value) }))}
              >
                {DAY_LABELS.map((d, i) => (
                  <option key={d} value={i}>
                    {d}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Start
              <input
                className="ml-1 w-20 rounded border border-border px-2 py-1 font-mono"
                value={newWin.start}
                onChange={(e) => setNewWin((n) => ({ ...n, start: e.target.value }))}
              />
            </label>
            <label>
              End
              <input
                className="ml-1 w-20 rounded border border-border px-2 py-1 font-mono"
                value={newWin.end}
                onChange={(e) => setNewWin((n) => ({ ...n, end: e.target.value }))}
              />
            </label>
            <label className="flex-1 min-w-[120px]">
              Occupation (optional)
              <input
                className="ml-1 w-full rounded border border-border px-2 py-1 font-mono text-[11px]"
                placeholder="slug"
                value={newWin.occupation_slug}
                onChange={(e) => setNewWin((n) => ({ ...n, occupation_slug: e.target.value }))}
              />
            </label>
            <button
              type="button"
              className="rounded-full bg-text text-white px-3 py-1.5 text-xs"
              onClick={() => {
                const sm = parseHHMM(newWin.start);
                const em = parseHHMM(newWin.end);
                if (sm == null || em == null || em <= sm) return;
                const row: WinRow = {
                  day_of_week: newWin.day_of_week,
                  start_minute: sm,
                  end_minute: em,
                  occupation_slug: newWin.occupation_slug.trim() || null,
                  recurring_only: true,
                  is_flexible: false,
                  is_active: true,
                };
                void saveWindows([...windows, row]);
              }}
            >
              Add window
            </button>
          </div>

          <ul className="space-y-2">
            {windows.map((w, idx) => (
              <li
                key={`${w.day_of_week}-${w.start_minute}-${w.end_minute}-${idx}`}
                className="flex flex-wrap items-center justify-between gap-2 text-xs rounded-lg border border-border px-3 py-2"
              >
                <span>
                  {DAY_LABELS[w.day_of_week]} {minutesToHHMM(w.start_minute)}–{minutesToHHMM(w.end_minute)}
                  {w.occupation_slug ? ` · ${w.occupation_slug}` : ''}
                </span>
                <button
                  type="button"
                  className="text-muted underline"
                  onClick={() => void saveWindows(windows.filter((_, i) => i !== idx))}
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>

          {windows.length > 0 && (
            <button
              type="button"
              disabled={savingWin}
              onClick={() => void saveWindows(windows)}
              className="text-xs rounded-full border border-border px-3 py-1 disabled:opacity-50"
            >
              Save all windows
            </button>
          )}
        </section>
      </div>
    </AppLayout>
  );
}
