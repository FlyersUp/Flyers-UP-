'use client';

import { Suspense } from 'react';
import { AppLayout } from '@/components/layouts/AppLayout';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';

type BookingRow = {
  id: string;
  service_date: string;
  service_time: string;
  status: string;
  pro?: { displayName: string | null } | null;
};

function statusToUiLabel(s: string): string {
  const lower = (s || '').toLowerCase();
  if (lower === 'accepted') return 'Scheduled';
  if (lower === 'on_the_way') return 'On the way';
  if (lower === 'in_progress') return 'In progress';
  if (lower === 'awaiting_payment') return 'Completed';
  if (lower === 'completed') return 'Completed';
  return s.replaceAll('_', ' ');
}

function CustomerBookingsContent() {
  const searchParams = useSearchParams();
  const [upcoming, setUpcoming] = useState<BookingRow[]>([]);
  const [past, setPast] = useState<BookingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'upcoming' | 'past'>('upcoming');

  useEffect(() => {
    setActiveTab(searchParams.get('past') === '1' ? 'past' : 'upcoming');
  }, [searchParams]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      const todayISO = new Date().toISOString().slice(0, 10);
      try {
        const [upRes, pastRes] = await Promise.all([
          fetch(
            `/api/customer/bookings?from=${todayISO}&limit=50&statuses=${encodeURIComponent(
              ['requested', 'accepted', 'on_the_way', 'in_progress', 'awaiting_payment'].join(',')
            )}`,
            { cache: 'no-store' }
          ),
          fetch(
            `/api/customer/bookings?limit=50&statuses=${encodeURIComponent(
              ['completed', 'cancelled', 'declined'].join(',')
            )}`,
            { cache: 'no-store' }
          ),
        ]);

        const upJson = (await upRes.json()) as { ok?: boolean; bookings?: BookingRow[] };
        const pastJson = (await pastRes.json()) as { ok?: boolean; bookings?: BookingRow[] };

        if (!mounted) return;
        setUpcoming(upJson.ok && upJson.bookings ? upJson.bookings : []);
        setPast(pastJson.ok && pastJson.bookings ? pastJson.bookings : []);
      } catch {
        if (!mounted) return;
        setUpcoming([]);
        setPast([]);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const rows = activeTab === 'upcoming' ? upcoming : past;

  return (
    <AppLayout mode="customer">
      <div className="max-w-4xl mx-auto px-4 py-6">
        <h1 className="text-2xl font-semibold text-text mb-6">Bookings</h1>

        <div className="flex gap-2 mb-6 border-b border-[var(--hairline)]">
          <button
            type="button"
            onClick={() => setActiveTab('upcoming')}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              activeTab === 'upcoming'
                ? 'border-text text-text'
                : 'border-transparent text-muted hover:text-text'
            }`}
          >
            Upcoming
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('past')}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              activeTab === 'past'
                ? 'border-text text-text'
                : 'border-transparent text-muted hover:text-text'
            }`}
          >
            Past
          </button>
        </div>

        {loading ? (
          <p className="text-sm text-muted">Loading…</p>
        ) : rows.length === 0 ? (
          <div className="rounded-2xl border border-[var(--hairline)] bg-[hsl(var(--surface))] p-6">
            <p className="text-sm font-medium text-text">
              {activeTab === 'upcoming' ? 'No upcoming bookings' : 'No past bookings'}
            </p>
            <p className="mt-1 text-sm text-muted">
              {activeTab === 'upcoming'
                ? 'When you book a pro, it will show up here.'
                : 'Your completed and cancelled bookings will appear here.'}
            </p>
            {activeTab === 'upcoming' && (
              <Link
                href="/customer/categories"
                className="mt-4 inline-block text-sm font-medium text-text hover:underline"
              >
                Browse services
              </Link>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {rows.map((b) => (
              <Link
                key={b.id}
                href={`/customer/bookings/${b.id}/track`}
                className="block rounded-2xl border border-[var(--hairline)] bg-[hsl(var(--surface))] p-5 hover:shadow-sm transition-shadow"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="font-medium text-text">{b.pro?.displayName || 'Service Pro'}</div>
                    <div className="text-sm text-muted mt-0.5">
                      {b.service_date} at {b.service_time}
                    </div>
                  </div>
                  <span
                    className="shrink-0 rounded-full px-3 py-1 text-xs font-medium"
                    style={{
                      backgroundColor:
                        ['completed', 'awaiting_payment'].includes((b.status || '').toLowerCase())
                          ? '#B2FBA5'
                          : 'hsl(var(--muted))',
                      color: 'hsl(var(--text))',
                    }}
                  >
                    {statusToUiLabel(b.status)}
                  </span>
                </div>
                <div className="mt-3 text-sm text-muted">
                  Track progress →
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}

export default function CustomerBookingsPage() {
  return (
    <Suspense
      fallback={
        <AppLayout mode="customer">
          <div className="max-w-4xl mx-auto px-4 py-6">
            <p className="text-sm text-muted">Loading…</p>
          </div>
        </AppLayout>
      }
    >
      <CustomerBookingsContent />
    </Suspense>
  );
}
