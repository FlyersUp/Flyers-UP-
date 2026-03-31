'use client';

import { useCallback, useEffect, useState } from 'react';

/** 0=Sun .. 6=Sat (matches DB and JS Date) */
const DAYS: { dow: number; label: string }[] = [
  { dow: 0, label: 'Sun' },
  { dow: 1, label: 'Mon' },
  { dow: 2, label: 'Tue' },
  { dow: 3, label: 'Wed' },
  { dow: 4, label: 'Thu' },
  { dow: 5, label: 'Fri' },
  { dow: 6, label: 'Sat' },
];

type RuleRow = { id?: string; day_of_week: number; start_time: string; end_time: string; is_available?: boolean };

function parseIntDraft(s: string): number | null {
  const t = s.trim();
  if (t === '') return null;
  const n = Number.parseInt(t, 10);
  return Number.isFinite(n) ? n : null;
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

export function ProCalendarAvailabilityPanel() {
  const [rules, setRules] = useState<RuleRow[]>([]);
  const [slotInterval, setSlotInterval] = useState(30);
  const [slotIntervalInput, setSlotIntervalInput] = useState('30');
  const [bufBefore, setBufBefore] = useState(0);
  const [bufBeforeInput, setBufBeforeInput] = useState('0');
  const [bufAfter, setBufAfter] = useState(0);
  const [bufAfterInput, setBufAfterInput] = useState('0');
  const [minNotice, setMinNotice] = useState(60);
  const [minNoticeInput, setMinNoticeInput] = useState('60');
  const [maxAdvance, setMaxAdvance] = useState(60);
  const [maxAdvanceInput, setMaxAdvanceInput] = useState('60');
  const [tz, setTz] = useState('');
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const [fullDay, setFullDay] = useState('');
  const [blkStart, setBlkStart] = useState('');
  const [blkEnd, setBlkEnd] = useState('');
  const [blockedList, setBlockedList] = useState<{ id: string; start_at: string; end_at: string; reason?: string | null }[]>(
    []
  );
  const [blockedDates, setBlockedDates] = useState<{ id: string; blocked_date: string; reason?: string | null }[]>([]);

  const loadRules = useCallback(async () => {
    const r = await fetch('/api/pro/availability/rules', { cache: 'no-store', credentials: 'include' });
    const j = await r.json();
    if (r.ok && j.ok && Array.isArray(j.rules)) {
      setRules(
        j.rules.map((x: RuleRow) => ({
          day_of_week: x.day_of_week,
          start_time: String(x.start_time).slice(0, 5),
          end_time: String(x.end_time).slice(0, 5),
        }))
      );
    }
  }, []);

  const loadSettings = useCallback(async () => {
    const r = await fetch('/api/pro/availability/settings', { cache: 'no-store', credentials: 'include' });
    const j = await r.json();
    if (r.ok && j.ok && j.settings) {
      const si = clamp(Number(j.settings.slot_interval_minutes ?? 30), 5, 240);
      const bb = clamp(Number(j.settings.buffer_before_minutes ?? 0), 0, 240);
      const ba = clamp(Number(j.settings.buffer_after_minutes ?? 0), 0, 240);
      const mn = clamp(Number(j.settings.min_notice_minutes ?? 60), 0, 10080);
      const ma = clamp(Number(j.settings.max_advance_days ?? 60), 1, 365);
      setSlotInterval(si);
      setSlotIntervalInput(String(si));
      setBufBefore(bb);
      setBufBeforeInput(String(bb));
      setBufAfter(ba);
      setBufAfterInput(String(ba));
      setMinNotice(mn);
      setMinNoticeInput(String(mn));
      setMaxAdvance(ma);
      setMaxAdvanceInput(String(ma));
      setTz(typeof j.settings.timezone === 'string' ? j.settings.timezone : '');
    }
  }, []);

  const loadBlocked = useCallback(async () => {
    const r = await fetch('/api/pro/blocked-times', { cache: 'no-store', credentials: 'include' });
    const j = await r.json();
    if (r.ok && j.ok) setBlockedList(Array.isArray(j.blocked) ? j.blocked : []);
    const d = await fetch('/api/pro/blocked-dates', { cache: 'no-store', credentials: 'include' });
    const dj = await d.json();
    if (d.ok && dj.ok) setBlockedDates(Array.isArray(dj.dates) ? dj.dates : []);
  }, []);

  useEffect(() => {
    void loadRules();
    void loadSettings();
    void loadBlocked();
  }, [loadRules, loadSettings, loadBlocked]);

  const saveRules = async () => {
    setSaving(true);
    setMsg(null);
    const body = {
      rules: rules.map((r) => ({
        dayOfWeek: r.day_of_week,
        startTime: r.start_time,
        endTime: r.end_time,
        isAvailable: true,
      })),
    };
    const res = await fetch('/api/pro/availability/rules', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(body),
    });
    setSaving(false);
    if (res.ok) {
      setMsg('Weekly hours saved.');
      void loadRules();
    } else {
      const j = await res.json().catch(() => ({}));
      setMsg(j.error || 'Could not save hours');
    }
  };

  const saveSettings = async () => {
    setSaving(true);
    setMsg(null);
    const slotParsed = parseIntDraft(slotIntervalInput);
    const bbParsed = parseIntDraft(bufBeforeInput);
    const baParsed = parseIntDraft(bufAfterInput);
    const mnParsed = parseIntDraft(minNoticeInput);
    const maParsed = parseIntDraft(maxAdvanceInput);
    const slotToSave = slotParsed != null ? clamp(slotParsed, 5, 240) : slotInterval;
    const bbToSave = bbParsed != null ? clamp(bbParsed, 0, 240) : bufBefore;
    const baToSave = baParsed != null ? clamp(baParsed, 0, 240) : bufAfter;
    const mnToSave = mnParsed != null ? clamp(mnParsed, 0, 10080) : minNotice;
    const maToSave = maParsed != null ? clamp(maParsed, 1, 365) : maxAdvance;
    const res = await fetch('/api/pro/availability/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        slot_interval_minutes: slotToSave,
        buffer_before_minutes: bbToSave,
        buffer_after_minutes: baToSave,
        min_notice_minutes: mnToSave,
        max_advance_days: maToSave,
        timezone: tz.trim() || 'America/New_York',
      }),
    });
    setSaving(false);
    if (res.ok) {
      setSlotInterval(slotToSave);
      setSlotIntervalInput(String(slotToSave));
      setBufBefore(bbToSave);
      setBufBeforeInput(String(bbToSave));
      setBufAfter(baToSave);
      setBufAfterInput(String(baToSave));
      setMinNotice(mnToSave);
      setMinNoticeInput(String(mnToSave));
      setMaxAdvance(maToSave);
      setMaxAdvanceInput(String(maToSave));
      setMsg('Settings saved.');
    } else {
      const j = await res.json().catch(() => ({}));
      setMsg(j.error || 'Could not save settings');
    }
  };

  const applyWeekdayDefault = () => {
    setRules(
      [1, 2, 3, 4, 5].map((d) => ({
        day_of_week: d,
        start_time: '09:00',
        end_time: '17:00',
      }))
    );
  };

  const addRow = (dow: number) => {
    setRules((prev) => [...prev, { day_of_week: dow, start_time: '09:00', end_time: '17:00' }]);
  };

  const removeRow = (idx: number) => {
    setRules((prev) => prev.filter((_, i) => i !== idx));
  };

  const updateRow = (idx: number, patch: Partial<RuleRow>) => {
    setRules((prev) => prev.map((r, i) => (i === idx ? { ...r, ...patch } : r)));
  };

  return (
    <div className="space-y-8 rounded-2xl border border-border bg-surface2/20 p-4">
      <div>
        <h2 className="text-lg font-semibold text-text">Weekly working hours</h2>
        <p className="text-sm text-muted mt-1">
          These windows define when customers can request bookings (with buffers and existing jobs applied automatically).
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={applyWeekdayDefault}
            className="rounded-lg border border-border bg-surface2 px-3 py-2 text-sm text-text"
          >
            Weekdays 9–5
          </button>
          <button
            type="button"
            onClick={() => setRules([])}
            className="rounded-lg border border-border bg-surface2 px-3 py-2 text-sm text-text"
          >
            Clear (use profile business hours)
          </button>
        </div>
        <div className="mt-4 space-y-4">
          {DAYS.map((d) => (
            <div key={d.dow} className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <span className="text-sm font-medium text-text w-10 shrink-0">{d.label}</span>
              <div className="flex-1 space-y-2">
                {rules.map((r, idx) =>
                  r.day_of_week !== d.dow ? null : (
                    <div key={`${d.dow}-${idx}`} className="flex flex-wrap items-center gap-2">
                      <input
                        type="time"
                        value={r.start_time}
                        onChange={(e) => updateRow(idx, { start_time: e.target.value })}
                        className="rounded-lg border border-border bg-bg px-2 py-1 text-sm"
                      />
                      <span className="text-muted">–</span>
                      <input
                        type="time"
                        value={r.end_time}
                        onChange={(e) => updateRow(idx, { end_time: e.target.value })}
                        className="rounded-lg border border-border bg-bg px-2 py-1 text-sm"
                      />
                      <button
                        type="button"
                        onClick={() => removeRow(idx)}
                        className="text-xs text-danger"
                      >
                        Remove
                      </button>
                    </div>
                  )
                )}
                <button
                  type="button"
                  onClick={() => addRow(d.dow)}
                  className="text-xs font-medium text-accent"
                >
                  + Add window
                </button>
              </div>
            </div>
          ))}
        </div>
        <button
          type="button"
          disabled={saving}
          onClick={() => void saveRules()}
          className="mt-4 w-full rounded-xl bg-accent text-accentContrast py-2.5 text-sm font-medium disabled:opacity-50"
        >
          Save weekly hours
        </button>
      </div>

      <div className="border-t border-border pt-6">
        <h2 className="text-lg font-semibold text-text">Slot & buffer settings</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <label className="text-sm">
            <span className="text-muted block mb-1">Slot interval (minutes)</span>
            <input
              type="text"
              inputMode="numeric"
              autoComplete="off"
              value={slotIntervalInput}
              onChange={(e) => setSlotIntervalInput(e.target.value)}
              onBlur={() => {
                const p = parseIntDraft(slotIntervalInput);
                if (p != null) {
                  const c = clamp(p, 5, 240);
                  setSlotInterval(c);
                  setSlotIntervalInput(String(c));
                } else {
                  setSlotIntervalInput(String(slotInterval));
                }
              }}
              className="w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm"
            />
          </label>
          <label className="text-sm">
            <span className="text-muted block mb-1">Calendar timezone (IANA)</span>
            <input
              type="text"
              placeholder="e.g. America/New_York"
              value={tz}
              onChange={(e) => setTz(e.target.value)}
              className="w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm"
            />
          </label>
          <label className="text-sm">
            <span className="text-muted block mb-1">Buffer before jobs (min)</span>
            <input
              type="text"
              inputMode="numeric"
              autoComplete="off"
              value={bufBeforeInput}
              onChange={(e) => setBufBeforeInput(e.target.value)}
              onBlur={() => {
                const p = parseIntDraft(bufBeforeInput);
                if (p != null) {
                  const c = clamp(p, 0, 240);
                  setBufBefore(c);
                  setBufBeforeInput(String(c));
                } else {
                  setBufBeforeInput(String(bufBefore));
                }
              }}
              className="w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm"
            />
          </label>
          <label className="text-sm">
            <span className="text-muted block mb-1">Buffer after jobs (min)</span>
            <input
              type="text"
              inputMode="numeric"
              autoComplete="off"
              value={bufAfterInput}
              onChange={(e) => setBufAfterInput(e.target.value)}
              onBlur={() => {
                const p = parseIntDraft(bufAfterInput);
                if (p != null) {
                  const c = clamp(p, 0, 240);
                  setBufAfter(c);
                  setBufAfterInput(String(c));
                } else {
                  setBufAfterInput(String(bufAfter));
                }
              }}
              className="w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm"
            />
          </label>
          <label className="text-sm">
            <span className="text-muted block mb-1">Min notice (min)</span>
            <input
              type="text"
              inputMode="numeric"
              autoComplete="off"
              value={minNoticeInput}
              onChange={(e) => setMinNoticeInput(e.target.value)}
              onBlur={() => {
                const p = parseIntDraft(minNoticeInput);
                if (p != null) {
                  const c = clamp(p, 0, 10080);
                  setMinNotice(c);
                  setMinNoticeInput(String(c));
                } else {
                  setMinNoticeInput(String(minNotice));
                }
              }}
              className="w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm"
            />
          </label>
          <label className="text-sm">
            <span className="text-muted block mb-1">Max advance (days)</span>
            <input
              type="text"
              inputMode="numeric"
              autoComplete="off"
              value={maxAdvanceInput}
              onChange={(e) => setMaxAdvanceInput(e.target.value)}
              onBlur={() => {
                const p = parseIntDraft(maxAdvanceInput);
                if (p != null) {
                  const c = clamp(p, 1, 365);
                  setMaxAdvance(c);
                  setMaxAdvanceInput(String(c));
                } else {
                  setMaxAdvanceInput(String(maxAdvance));
                }
              }}
              className="w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm"
            />
          </label>
        </div>
        <button
          type="button"
          disabled={saving}
          onClick={() => void saveSettings()}
          className="mt-4 w-full rounded-xl border border-border bg-surface2 py-2.5 text-sm font-medium text-text disabled:opacity-50"
        >
          Save settings
        </button>
      </div>

      <div className="border-t border-border pt-6">
        <h2 className="text-lg font-semibold text-text">Block time off</h2>
        <div className="mt-3 space-y-3">
          <div className="flex flex-wrap gap-2 items-end">
            <label className="text-sm flex-1 min-w-[140px]">
              <span className="text-muted block mb-1">Full day (date)</span>
              <input
                type="date"
                value={fullDay}
                onChange={(e) => setFullDay(e.target.value)}
                className="w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm"
              />
            </label>
            <button
              type="button"
              onClick={async () => {
                if (!fullDay) return;
                await fetch('/api/pro/blocked-dates', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  credentials: 'include',
                  body: JSON.stringify({ date: fullDay }),
                });
                setFullDay('');
                void loadBlocked();
              }}
              className="rounded-xl bg-surface2 border border-border px-4 py-2 text-sm"
            >
              Block day
            </button>
          </div>
          <div className="flex flex-wrap gap-2 items-end">
            <label className="text-sm">
              <span className="text-muted block mb-1">From (local)</span>
              <input
                type="datetime-local"
                value={blkStart}
                onChange={(e) => setBlkStart(e.target.value)}
                className="rounded-lg border border-border bg-bg px-3 py-2 text-sm"
              />
            </label>
            <label className="text-sm">
              <span className="text-muted block mb-1">To (local)</span>
              <input
                type="datetime-local"
                value={blkEnd}
                onChange={(e) => setBlkEnd(e.target.value)}
                className="rounded-lg border border-border bg-bg px-3 py-2 text-sm"
              />
            </label>
            <button
              type="button"
              onClick={async () => {
                if (!blkStart || !blkEnd) return;
                const s = new Date(blkStart);
                const e = new Date(blkEnd);
                if (!(s instanceof Date) || Number.isNaN(s.getTime())) return;
                if (!(e instanceof Date) || Number.isNaN(e.getTime())) return;
                await fetch('/api/pro/blocked-times', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  credentials: 'include',
                  body: JSON.stringify({ startAt: s.toISOString(), endAt: e.toISOString() }),
                });
                setBlkStart('');
                setBlkEnd('');
                void loadBlocked();
              }}
              className="rounded-xl bg-surface2 border border-border px-4 py-2 text-sm"
            >
              Block range
            </button>
          </div>
        </div>

        <div className="mt-4 space-y-2">
          <p className="text-xs font-medium text-muted uppercase tracking-wide">Blocked days</p>
          {blockedDates.length === 0 ? (
            <p className="text-sm text-muted">None</p>
          ) : (
            <ul className="space-y-1">
              {blockedDates.map((bd) => (
                <li key={bd.id} className="flex items-center justify-between gap-2 text-sm">
                  <span>{bd.blocked_date}</span>
                  <button
                    type="button"
                    className="text-danger text-xs"
                    onClick={async () => {
                      await fetch(
                        `/api/pro/blocked-dates?date=${encodeURIComponent(bd.blocked_date)}`,
                        { method: 'DELETE', credentials: 'include' }
                      );
                      void loadBlocked();
                    }}
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          )}
          <p className="text-xs font-medium text-muted uppercase tracking-wide pt-2">Blocked ranges</p>
          {blockedList.length === 0 ? (
            <p className="text-sm text-muted">None</p>
          ) : (
            <ul className="space-y-1">
              {blockedList.map((b) => (
                <li key={b.id} className="flex items-center justify-between gap-2 text-sm">
                  <span className="truncate">
                    {b.start_at} → {b.end_at}
                  </span>
                  <button
                    type="button"
                    className="text-danger text-xs shrink-0"
                    onClick={async () => {
                      await fetch(`/api/pro/blocked-times/${encodeURIComponent(b.id)}`, {
                        method: 'DELETE',
                        credentials: 'include',
                      });
                      void loadBlocked();
                    }}
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {msg && <p className="text-sm text-text">{msg}</p>}
    </div>
  );
}
