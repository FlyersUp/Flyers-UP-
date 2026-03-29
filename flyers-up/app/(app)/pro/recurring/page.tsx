'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { AppLayout } from '@/components/layouts/AppLayout';
import { RECURRING_FRIENDLY_OCCUPATION_SLUGS } from '@/lib/recurring/constants';

type Series = {
  id: string;
  status: string;
  occupation_slug: string;
  customer_user_id: string;
  created_at: string;
};

type OccRow = {
  id: string;
  scheduled_start_at: string;
  scheduled_end_at: string;
  status: string;
  booking_id: string | null;
};

type SeriesDetail = {
  series: Record<string, unknown>;
  occurrences: OccRow[];
};

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function ProRecurringDashboardPage() {
  const [series, setSeries] = useState<Series[]>([]);
  const [spots, setSpots] = useState<{ max: number; used: number; left: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState<SeriesDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [counterSeriesId, setCounterSeriesId] = useState<string | null>(null);
  const [counterForm, setCounterForm] = useState({
    frequency: 'weekly' as 'weekly' | 'biweekly' | 'monthly' | 'custom',
    preferred_start_time: '09:00',
    duration_minutes: 60,
    days_of_week: [1, 3, 5] as number[],
    pro_note: '',
  });

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([
      fetch('/api/recurring/series?as=pro', { credentials: 'include' }).then((r) => r.json()),
      fetch('/api/pro/availability/recurring-eligible', { credentials: 'include' }).then((r) => r.json()),
    ])
      .then(([s, e]) => {
        if (s.ok && s.series) setSeries(s.series);
        if (e.ok) {
          setSpots({
            max: e.max_recurring_customers,
            used: e.approved_distinct_customers,
            left: e.spots_left,
          });
        }
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const openDetail = async (id: string) => {
    setDetailLoading(true);
    setDetail(null);
    try {
      const r = await fetch(`/api/recurring/series/${id}`, { credentials: 'include' });
      const j = await r.json();
      if (j.ok) setDetail({ series: j.series, occurrences: j.occurrences ?? [] });
    } finally {
      setDetailLoading(false);
    }
  };

  const submitCounter = async (seriesId: string) => {
    const res = await fetch(`/api/recurring/series/${seriesId}/counter`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        counter_proposal: {
          frequency: counterForm.frequency,
          preferred_start_time:
            counterForm.preferred_start_time.split(':').length === 2
              ? `${counterForm.preferred_start_time}:00`
              : counterForm.preferred_start_time,
          duration_minutes: counterForm.duration_minutes,
          days_of_week: counterForm.days_of_week,
        },
        pro_note: counterForm.pro_note || undefined,
      }),
    });
    if (res.ok) {
      setCounterSeriesId(null);
      void load();
      if (detail?.series.id === seriesId) void openDetail(seriesId);
    }
  };

  const pending = series.filter((x) => x.status === 'pending' || x.status === 'countered');
  const approved = series.filter((x) => x.status === 'approved');
  const paused = series.filter((x) => x.status === 'paused');

  return (
    <AppLayout mode="pro">
      <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
        <Link href="/pro" className="text-sm text-muted hover:text-text">
          ← Pro home
        </Link>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-text">Recurring clients</h1>
            <p className="text-sm text-muted mt-1">Approve requests, counter terms, materialize visits, tune settings.</p>
          </div>
          <Link
            href="/pro/recurring/settings"
            className="rounded-full border border-border px-4 py-2 text-sm font-medium"
          >
            Recurring settings
          </Link>
        </div>

        {spots && (
          <div className="rounded-xl border border-border bg-[hsl(var(--card-neutral))] px-4 py-3 text-sm">
            <span className="font-medium text-text">Recurring spots left:</span>{' '}
            <span className="text-muted">
              {spots.left} of {spots.max} ({spots.used} repeat clients)
            </span>
          </div>
        )}

        {loading ? (
          <p className="text-sm text-muted">Loading…</p>
        ) : (
          <>
            <section>
              <h2 className="text-sm font-semibold text-text mb-2">Pending</h2>
              {pending.length === 0 ? (
                <p className="text-sm text-muted">No open requests.</p>
              ) : (
                <ul className="space-y-2">
                  {pending.map((r) => (
                    <li key={r.id} className="rounded-xl border border-border p-3 space-y-2">
                      <div className="flex flex-wrap justify-between gap-2">
                        <div>
                          <div className="text-sm font-medium">{r.occupation_slug}</div>
                          <div className="text-xs text-muted font-mono">{r.id.slice(0, 8)}…</div>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {r.status === 'pending' && (
                            <>
                              <button
                                type="button"
                                className="text-xs rounded-full bg-emerald-600 text-white px-3 py-1"
                                onClick={() =>
                                  fetch(`/api/recurring/series/${r.id}/approve`, {
                                    method: 'POST',
                                    credentials: 'include',
                                  }).then(() => load())
                                }
                              >
                                Approve
                              </button>
                              <button
                                type="button"
                                className="text-xs rounded-full border border-border px-3 py-1"
                                onClick={() => setCounterSeriesId(counterSeriesId === r.id ? null : r.id)}
                              >
                                Counter
                              </button>
                            </>
                          )}
                          <button
                            type="button"
                            className="text-xs rounded-full border border-border px-3 py-1"
                            onClick={() => void openDetail(r.id)}
                          >
                            Details
                          </button>
                          <button
                            type="button"
                            className="text-xs rounded-full border border-border px-3 py-1"
                            onClick={() =>
                              fetch(`/api/recurring/series/${r.id}/decline`, {
                                method: 'POST',
                                credentials: 'include',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({}),
                              }).then(() => load())
                            }
                          >
                            Decline
                          </button>
                        </div>
                      </div>
                      {counterSeriesId === r.id && r.status === 'pending' && (
                        <div className="rounded-lg bg-black/[0.02] p-3 space-y-2 text-xs">
                          <label className="block">
                            <span className="text-muted">Frequency</span>
                            <select
                              className="mt-0.5 w-full rounded border border-border px-2 py-1"
                              value={counterForm.frequency}
                              onChange={(e) =>
                                setCounterForm((f) => ({
                                  ...f,
                                  frequency: e.target.value as typeof counterForm.frequency,
                                }))
                              }
                            >
                              <option value="weekly">weekly</option>
                              <option value="biweekly">biweekly</option>
                              <option value="monthly">monthly</option>
                              <option value="custom">custom</option>
                            </select>
                          </label>
                          <label className="block">
                            <span className="text-muted">Preferred start (HH:MM)</span>
                            <input
                              type="time"
                              className="mt-0.5 w-full rounded border border-border px-2 py-1 font-mono"
                              value={counterForm.preferred_start_time}
                              onChange={(e) =>
                                setCounterForm((f) => ({
                                  ...f,
                                  preferred_start_time: e.target.value || '09:00',
                                }))
                              }
                            />
                          </label>
                          <label className="block">
                            <span className="text-muted">Duration (minutes)</span>
                            <input
                              type="number"
                              min={15}
                              className="mt-0.5 w-full rounded border border-border px-2 py-1"
                              value={counterForm.duration_minutes}
                              onChange={(e) =>
                                setCounterForm((f) => ({ ...f, duration_minutes: Number(e.target.value) || 60 }))
                              }
                            />
                          </label>
                          <div>
                            <span className="text-muted">Days</span>
                            <div className="mt-1 flex flex-wrap gap-2">
                              {DAYS.map((d, i) => (
                                <label key={d} className="flex items-center gap-1">
                                  <input
                                    type="checkbox"
                                    checked={counterForm.days_of_week.includes(i)}
                                    onChange={() =>
                                      setCounterForm((f) => ({
                                        ...f,
                                        days_of_week: f.days_of_week.includes(i)
                                          ? f.days_of_week.filter((x) => x !== i)
                                          : [...f.days_of_week, i].sort(),
                                      }))
                                    }
                                  />
                                  {d}
                                </label>
                              ))}
                            </div>
                          </div>
                          <label className="block">
                            <span className="text-muted">Note to customer (optional)</span>
                            <textarea
                              className="mt-0.5 w-full rounded border border-border px-2 py-1"
                              rows={2}
                              value={counterForm.pro_note}
                              onChange={(e) => setCounterForm((f) => ({ ...f, pro_note: e.target.value }))}
                            />
                          </label>
                          <button
                            type="button"
                            className="rounded-full bg-text text-white px-3 py-1.5 text-xs font-medium"
                            onClick={() => void submitCounter(r.id)}
                          >
                            Send counter
                          </button>
                        </div>
                      )}
                      {r.status === 'countered' && (
                        <p className="text-xs text-muted">Waiting for customer to accept your counter.</p>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section>
              <h2 className="text-sm font-semibold text-text mb-2">Approved</h2>
              {approved.length === 0 ? (
                <p className="text-sm text-muted">No approved series yet.</p>
              ) : (
                <ul className="space-y-2">
                  {approved.map((r) => (
                    <li key={r.id} className="rounded-xl border border-border p-3 space-y-2">
                      <div className="flex flex-wrap justify-between gap-2">
                        <span className="text-sm">{r.occupation_slug}</span>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            className="text-xs text-muted underline"
                            onClick={() => void openDetail(r.id)}
                          >
                            Details / visits
                          </button>
                          <button
                            type="button"
                            className="text-xs text-muted underline"
                            onClick={() =>
                              fetch(`/api/recurring/series/${r.id}/pause`, {
                                method: 'POST',
                                credentials: 'include',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({}),
                              }).then(() => load())
                            }
                          >
                            Pause
                          </button>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section>
              <h2 className="text-sm font-semibold text-text mb-2">Paused</h2>
              {paused.length === 0 ? (
                <p className="text-sm text-muted">None</p>
              ) : (
                <ul className="space-y-2">
                  {paused.map((r) => (
                    <li key={r.id} className="rounded-xl border border-border p-3 flex justify-between gap-2">
                      <span className="text-sm">{r.occupation_slug}</span>
                      <button
                        type="button"
                        className="text-xs text-muted underline"
                        onClick={() =>
                          fetch(`/api/recurring/series/${r.id}/resume`, { method: 'POST', credentials: 'include' }).then(
                            () => load()
                          )
                        }
                      >
                        Resume
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            {(detailLoading || detail) && (
              <section className="rounded-xl border border-border p-4 space-y-3">
                <h3 className="text-sm font-semibold text-text">Series detail</h3>
                {detailLoading && <p className="text-xs text-muted">Loading…</p>}
                {detail && (
                  <>
                    <div className="text-xs text-muted font-mono">{(detail.series.id as string)?.slice(0, 8)}…</div>
                    <p className="text-xs text-muted">
                      Status: {String(detail.series.status)} · Timezone: {String(detail.series.timezone ?? '—')}
                    </p>
                    <div className="space-y-1 max-h-64 overflow-y-auto">
                      {detail.occurrences.slice(0, 40).map((o) => (
                        <div
                          key={o.id}
                          className="flex flex-wrap items-center justify-between gap-2 text-xs border-b border-border/60 py-1"
                        >
                          <span className="font-mono text-muted">
                            {new Date(o.scheduled_start_at).toLocaleString()}
                          </span>
                          <span>{o.status}</span>
                          {!o.booking_id &&
                            ['scheduled', 'pending_confirmation', 'confirmed'].includes(o.status) && (
                              <button
                                type="button"
                                className="text-[11px] underline text-text"
                                onClick={() =>
                                  fetch(`/api/recurring/occurrences/${o.id}/generate-booking`, {
                                    method: 'POST',
                                    credentials: 'include',
                                  }).then(() => void openDetail(String(detail.series.id)))
                                }
                              >
                                Create booking
                              </button>
                            )}
                          {o.booking_id && (
                            <Link href={`/pro/bookings/${o.booking_id}`} className="text-[11px] underline">
                              Booking
                            </Link>
                          )}
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </section>
            )}
          </>
        )}

        <p className="text-xs text-muted">
          Occupation allow-list and recurring-only windows:{' '}
          <Link href="/pro/recurring/settings" className="underline">
            settings
          </Link>
          . Friendly defaults: {RECURRING_FRIENDLY_OCCUPATION_SLUGS.slice(0, 4).join(', ')}…
        </p>
      </div>
    </AppLayout>
  );
}
