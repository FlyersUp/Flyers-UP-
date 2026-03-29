'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { AppLayout } from '@/components/layouts/AppLayout';

type Series = {
  id: string;
  status: string;
  occupation_slug: string;
  customer_user_id: string;
  created_at: string;
};

export default function ProRecurringDashboardPage() {
  const [series, setSeries] = useState<Series[]>([]);
  const [spots, setSpots] = useState<{ max: number; used: number; left: number } | null>(null);
  const [loading, setLoading] = useState(true);

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
            <p className="text-sm text-muted mt-1">Approve requests, manage repeat schedules, and tune settings.</p>
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
                    <li key={r.id} className="rounded-xl border border-border p-3 flex flex-wrap justify-between gap-2">
                      <div>
                        <div className="text-sm font-medium">{r.occupation_slug}</div>
                        <div className="text-xs text-muted font-mono">{r.id.slice(0, 8)}…</div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          className="text-xs rounded-full bg-emerald-600 text-white px-3 py-1"
                          onClick={() =>
                            fetch(`/api/recurring/series/${r.id}/approve`, { method: 'POST', credentials: 'include' }).then(
                              () => load()
                            )
                          }
                        >
                          Approve
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
                    <li key={r.id} className="rounded-xl border border-border p-3 flex justify-between gap-2">
                      <span className="text-sm">{r.occupation_slug}</span>
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
          </>
        )}
      </div>
    </AppLayout>
  );
}
