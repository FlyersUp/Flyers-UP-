'use client';

import { Suspense } from 'react';
import { AppLayout } from '@/components/layouts/AppLayout';
import { BookingStatusBadge } from '@/components/bookings/BookingStatusBadge';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Image from 'next/image';

const UPCOMING_STATUSES = 'requested,pending,accepted,pro_en_route,on_the_way,arrived,in_progress,completed_pending_payment,awaiting_payment,awaiting_remaining_payment';
const COMPLETED_STATUSES = 'completed,paid,awaiting_customer_confirmation';
const CANCELLED_STATUSES = 'cancelled,declined';

type BookingRow = {
  id: string;
  service_date: string;
  service_time: string;
  status: string;
  price: number | null;
  pro?: { displayName: string | null; logoUrl?: string | null; serviceName?: string | null } | null;
};

function BookingHistoryCard({ b }: { b: BookingRow }) {
  const fmt = (n: number | null) => (n != null ? `$${n.toFixed(2)}` : '—');
  return (
    <Link
      href={`/customer/bookings/${b.id}`}
      className="flex gap-4 rounded-2xl border border-[var(--hairline)] p-5 hover:shadow-sm transition-all bg-white"
    >
      <div className="shrink-0 w-12 h-12 rounded-full overflow-hidden bg-surface2 border border-hairline flex items-center justify-center">
        {b.pro?.logoUrl ? (
          <Image src={b.pro.logoUrl} alt="" width={48} height={48} className="object-cover" />
        ) : (
          <span className="text-lg text-muted">👤</span>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="font-medium text-text">{b.pro?.displayName || 'Service Pro'}</div>
        <div className="text-sm text-muted">{(b.pro as { serviceName?: string })?.serviceName || 'Service'}</div>
        <div className="text-sm text-muted mt-0.5">
          {b.service_date} at {b.service_time}
        </div>
      </div>
      <div className="shrink-0 text-right">
        <div className="font-medium text-text">{fmt(b.price)}</div>
        <BookingStatusBadge status={b.status} />
      </div>
    </Link>
  );
}

function CustomerBookingsHistoryContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [upcoming, setUpcoming] = useState<BookingRow[]>([]);
  const [completed, setCompleted] = useState<BookingRow[]>([]);
  const [cancelled, setCancelled] = useState<BookingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'upcoming' | 'completed' | 'cancelled'>('upcoming');

  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab === 'completed') setActiveTab('completed');
    else if (tab === 'cancelled') setActiveTab('cancelled');
    else setActiveTab('upcoming');
  }, [searchParams]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      const todayISO = new Date().toISOString().slice(0, 10);
      try {
        const [upcomingRes, completedRes, cancelledRes] = await Promise.all([
          fetch(
            `/api/customer/bookings?from=${todayISO}&limit=50&statuses=${encodeURIComponent(UPCOMING_STATUSES)}`,
            { cache: 'no-store' }
          ),
          fetch(
            `/api/customer/bookings?limit=50&statuses=${encodeURIComponent(COMPLETED_STATUSES)}`,
            { cache: 'no-store' }
          ),
          fetch(
            `/api/customer/bookings?limit=50&statuses=${encodeURIComponent(CANCELLED_STATUSES)}`,
            { cache: 'no-store' }
          ),
        ]);

        const upcomingJson = (await upcomingRes.json()) as { ok?: boolean; bookings?: BookingRow[] };
        const completedJson = (await completedRes.json()) as { ok?: boolean; bookings?: BookingRow[] };
        const cancelledJson = (await cancelledRes.json()) as { ok?: boolean; bookings?: BookingRow[] };

        if (!mounted) return;
        setUpcoming(upcomingJson.ok && upcomingJson.bookings ? upcomingJson.bookings : []);
        setCompleted(completedJson.ok && completedJson.bookings ? completedJson.bookings : []);
        setCancelled(cancelledJson.ok && cancelledJson.bookings ? cancelledJson.bookings : []);
      } catch {
        if (!mounted) return;
        setUpcoming([]);
        setCompleted([]);
        setCancelled([]);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  const rows = activeTab === 'upcoming' ? upcoming : activeTab === 'completed' ? completed : cancelled;

  return (
    <AppLayout mode="customer">
      <div className="max-w-4xl mx-auto px-4 py-6">
        <p className="text-sm text-muted mb-6">
          <Link href="/customer/bookings" className="hover:text-text">← Back to bookings</Link>
        </p>
        <h1 className="text-2xl font-semibold text-text mb-6">Booking History</h1>

        <div className="flex gap-2 mb-6 border-b border-[var(--hairline)]">
          {(['upcoming', 'completed', 'cancelled'] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => router.replace(`/customer/bookings/history?tab=${tab}`, { scroll: false })}
              className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors capitalize ${
                activeTab === tab ? 'border-text text-text' : 'border-transparent text-muted hover:text-text'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-24 rounded-2xl bg-gray-200 animate-pulse" />
            ))}
          </div>
        ) : rows.length === 0 ? (
          <div className="rounded-2xl border border-[var(--hairline)] p-6 bg-white">
            <p className="text-sm font-medium text-text">
              {activeTab === 'upcoming' ? 'No upcoming bookings' : activeTab === 'completed' ? 'No completed bookings' : 'No cancelled bookings'}
            </p>
            <p className="mt-1 text-sm text-muted">
              {activeTab === 'upcoming' ? 'When you book a pro, it will show up here.' : activeTab === 'completed' ? 'Your completed bookings will appear here.' : 'Cancelled bookings will appear here.'}
            </p>
            {activeTab === 'upcoming' && (
              <Link href="/occupations" className="mt-4 inline-block text-sm font-medium text-text hover:underline">
                Browse occupations
              </Link>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {rows.map((b) => (
              <BookingHistoryCard key={b.id} b={b} />
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}

export default function CustomerBookingsHistoryPage() {
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
      <CustomerBookingsHistoryContent />
    </Suspense>
  );
}
