'use client';

import { Suspense } from 'react';
import { AppLayout } from '@/components/layouts/AppLayout';
import { BookingsTabsLayout, type BookingsTab } from '@/components/bookings/BookingsTabsLayout';
import { BookingStatusBadge } from '@/components/bookings/BookingStatusBadge';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

const ACTIVE_STATUSES = 'requested,pending,accepted,on_the_way,in_progress,awaiting_payment';
const HISTORY_STATUSES = 'completed,cancelled,declined';

type BookingRow = {
  id: string;
  service_date: string;
  service_time: string;
  address: string | null;
  status: string;
  customer?: { fullName: string | null } | null;
};

function ProBookingsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [active, setActive] = useState<BookingRow[]>([]);
  const [history, setHistory] = useState<BookingRow[]>([]);
  const [allBookings, setAllBookings] = useState<BookingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<BookingsTab>('active');

  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab === 'history') setActiveTab('history');
    else if (tab === 'all') setActiveTab('all');
    else setActiveTab('active');
  }, [searchParams]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      try {
        const [activeRes, historyRes, allRes] = await Promise.all([
          fetch(`/api/pro/bookings?statuses=${encodeURIComponent(ACTIVE_STATUSES)}&limit=50`, {
            cache: 'no-store',
          }),
          fetch(`/api/pro/bookings?statuses=${encodeURIComponent(HISTORY_STATUSES)}&limit=50`, {
            cache: 'no-store',
          }),
          fetch(`/api/pro/bookings?limit=100`, { cache: 'no-store' }),
        ]);

        const activeJson = (await activeRes.json()) as { ok?: boolean; bookings?: BookingRow[] };
        const historyJson = (await historyRes.json()) as { ok?: boolean; bookings?: BookingRow[] };
        const allJson = (await allRes.json()) as { ok?: boolean; bookings?: BookingRow[] };

        if (!mounted) return;
        setActive(activeJson.ok && activeJson.bookings ? activeJson.bookings : []);
        setHistory(historyJson.ok && historyJson.bookings ? historyJson.bookings : []);
        setAllBookings(allJson.ok && allJson.bookings ? allJson.bookings : []);
      } catch {
        if (!mounted) return;
        setActive([]);
        setHistory([]);
        setAllBookings([]);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  const rows =
    activeTab === 'active' ? active : activeTab === 'history' ? history : allBookings;

  return (
    <AppLayout mode="pro">
      <BookingsTabsLayout
        title="Bookings"
        activeTab={activeTab}
        onTabChange={(t) => {
          setActiveTab(t);
          router.replace(`/pro/bookings?tab=${t}`, { scroll: false });
        }}
      >
        {loading ? (
          <p className="text-sm text-muted">Loading…</p>
        ) : rows.length === 0 ? (
          <div
            className="rounded-2xl border border-[var(--hairline)] p-6"
            style={{ backgroundColor: '#F2F2F0' }}
          >
            <p className="text-sm font-medium text-text">
              {activeTab === 'active'
                ? 'No active bookings'
                : activeTab === 'history'
                  ? 'No past bookings'
                  : 'No bookings yet'}
            </p>
            <p className="mt-1 text-sm text-muted">
              Your bookings will appear here when customers request your services.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {rows.map((b) => (
              <Link
                key={b.id}
                href={`/pro/bookings/${b.id}`}
                className="block rounded-2xl border border-[var(--hairline)] p-5 hover:shadow-sm transition-shadow"
                style={{ backgroundColor: '#F2F2F0' }}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="font-medium text-text">
                      {b.customer?.fullName || 'Customer'}
                    </div>
                    <div className="text-sm text-muted mt-0.5">
                      {b.service_date} at {b.service_time}
                    </div>
                    {b.address && (
                      <div className="text-xs text-muted mt-1 truncate max-w-[200px]">
                        {b.address}
                      </div>
                    )}
                  </div>
                  <BookingStatusBadge status={b.status} />
                </div>
                <div className="mt-3 text-sm text-muted">View booking →</div>
              </Link>
            ))}
          </div>
        )}
      </BookingsTabsLayout>
    </AppLayout>
  );
}

export default function ProBookingsPage() {
  return (
    <Suspense
      fallback={
        <AppLayout mode="pro">
          <div className="max-w-4xl mx-auto px-4 py-6">
            <p className="text-sm text-muted">Loading…</p>
          </div>
        </AppLayout>
      }
    >
      <ProBookingsContent />
    </Suspense>
  );
}
