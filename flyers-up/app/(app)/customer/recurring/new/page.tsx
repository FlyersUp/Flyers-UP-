'use client';

import { Suspense, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { AppLayout } from '@/components/layouts/AppLayout';
import { normalizeUuidOrNull } from '@/lib/isUuid';

const DAYS = [
  { v: 0, l: 'Sun' },
  { v: 1, l: 'Mon' },
  { v: 2, l: 'Tue' },
  { v: 3, l: 'Wed' },
  { v: 4, l: 'Thu' },
  { v: 5, l: 'Fri' },
  { v: 6, l: 'Sat' },
];

function CustomerRecurringNewInner() {
  const sp = useSearchParams();
  const proId = useMemo(() => normalizeUuidOrNull(sp.get('proId')), [sp]);

  const [frequency, setFrequency] = useState<'weekly' | 'biweekly' | 'monthly'>('weekly');
  const [days, setDays] = useState<number[]>([1]);
  const [startDate, setStartDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [time, setTime] = useState('15:00');
  const [duration, setDuration] = useState(60);
  const [timezone, setTimezone] = useState('America/New_York');
  const [note, setNote] = useState('');
  const [occupationSlug, setOccupationSlug] = useState('tutoring');
  const [msg, setMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function toggleDay(d: number) {
    setDays((prev) => (prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d].sort()));
  }

  async function submit() {
    if (!proId) {
      setMsg('Missing pro');
      return;
    }
    if (days.length === 0) {
      setMsg('Pick at least one weekday');
      return;
    }
    setLoading(true);
    setMsg(null);
    try {
      const res = await fetch('/api/recurring/request', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pro_id: proId,
          occupation_slug: occupationSlug,
          frequency,
          interval_count: 1,
          days_of_week: days,
          start_date: startDate,
          preferred_start_time: time,
          duration_minutes: duration,
          timezone,
          customer_note: note || undefined,
        }),
      });
      const j = await res.json();
      if (!res.ok) {
        setMsg(j.error ?? 'Request failed');
        return;
      }
      setMsg(
        j.status === 'approved'
          ? 'Your recurring plan was approved and added to calendars.'
          : 'Request sent. The pro will review your recurring schedule.'
      );
    } catch {
      setMsg('Network error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <AppLayout mode="customer">
      <div className="max-w-lg mx-auto px-4 py-6 space-y-6">
        <Link href={proId ? `/customer/pros/${proId}` : '/customer/favorites'} className="text-sm text-muted hover:text-text">
          ← Back
        </Link>
        <div>
          <h1 className="text-2xl font-semibold text-text">Request recurring schedule</h1>
          <p className="text-sm text-muted mt-1">
            Great for weekly tutoring, cleaning, dog walking, and other repeat work. The pro must approve before anything
            appears on calendars.
          </p>
        </div>

        {!proId && <p className="text-sm text-amber-700">Open this page from a pro profile to attach the request.</p>}

        <label className="block text-sm">
          <span className="text-muted">Occupation slug</span>
          <input
            value={occupationSlug}
            onChange={(e) => setOccupationSlug(e.target.value)}
            className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
            placeholder="tutoring"
          />
        </label>

        <label className="block text-sm">
          <span className="text-muted">Frequency</span>
          <select
            value={frequency}
            onChange={(e) => setFrequency(e.target.value as 'weekly' | 'biweekly' | 'monthly')}
            className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
          >
            <option value="weekly">Weekly</option>
            <option value="biweekly">Biweekly</option>
            <option value="monthly">Monthly</option>
          </select>
        </label>

        <div className="text-sm">
          <div className="text-muted mb-2">Days</div>
          <div className="flex flex-wrap gap-2">
            {DAYS.map((d) => (
              <button
                key={d.v}
                type="button"
                onClick={() => toggleDay(d.v)}
                className={`rounded-full px-3 py-1 text-xs font-medium border ${
                  days.includes(d.v) ? 'bg-[hsl(var(--accent-customer))] text-black border-transparent' : 'border-border'
                }`}
              >
                {d.l}
              </button>
            ))}
          </div>
        </div>

        <label className="block text-sm">
          <span className="text-muted">Start date</span>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
          />
        </label>

        <label className="block text-sm">
          <span className="text-muted">Preferred start time</span>
          <input
            type="time"
            value={time}
            onChange={(e) => setTime(e.target.value)}
            className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
          />
        </label>

        <label className="block text-sm">
          <span className="text-muted">Duration (minutes)</span>
          <input
            type="number"
            min={15}
            value={duration}
            onChange={(e) => setDuration(Number(e.target.value))}
            className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
          />
        </label>

        <label className="block text-sm">
          <span className="text-muted">Timezone</span>
          <input
            value={timezone}
            onChange={(e) => setTimezone(e.target.value)}
            className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
          />
        </label>

        <label className="block text-sm">
          <span className="text-muted">Note to pro</span>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={3}
            className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
            placeholder="Subject focus, access instructions, pet names…"
          />
        </label>

        {msg && <p className="text-sm text-text">{msg}</p>}

        <button
          type="button"
          disabled={loading || !proId}
          onClick={() => void submit()}
          className="w-full rounded-full bg-[hsl(var(--accent-customer))] text-black py-3 text-sm font-semibold disabled:opacity-50"
        >
          {loading ? 'Sending…' : 'Submit recurring request'}
        </button>
      </div>
    </AppLayout>
  );
}

export default function CustomerRecurringNewPage() {
  return (
    <Suspense
      fallback={
        <AppLayout mode="customer">
          <div className="max-w-lg mx-auto px-4 py-6 text-sm text-muted">Loading…</div>
        </AppLayout>
      }
    >
      <CustomerRecurringNewInner />
    </Suspense>
  );
}
