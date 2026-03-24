'use client';

import { Suspense } from 'react';
import { AppLayout } from '@/components/layouts/AppLayout';
import { CustomerPageShell } from '@/components/customer/CustomerPageShell';
import { BookingsTabsLayout, type BookingsTab } from '@/components/bookings/BookingsTabsLayout';
import { HintManager } from '@/components/guidance/HintManager';
import { BookingStatusBadge } from '@/components/bookings/BookingStatusBadge';
import { DashboardCard } from '@/components/dashboard/DashboardCard';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

/** All non-terminal pipeline statuses (must stay in sync with booking flow / DB). */
const ACTIVE_STATUSES = [
  'requested',
  'pending',
  'pending_pro_acceptance',
  'accepted',
  'accepted_pending_payment',
  'payment_required',
  'awaiting_deposit_payment',
  'deposit_paid',
  'pro_en_route',
  'on_the_way',
  'arrived',
  'in_progress',
  'work_completed_by_pro',
  'completed_pending_payment',
  'awaiting_payment',
  'awaiting_remaining_payment',
  'awaiting_customer_confirmation',
].join(',');

const COMPLETED_STATUSES = 'completed,paid,fully_paid,review_pending';
const CANCELLED_STATUSES =
  'cancelled,declined,expired_unpaid,cancelled_expired,cancelled_by_customer,cancelled_by_pro,cancelled_admin';

type BookingRow = {
  id: string;
  service_date: string;
  service_time: string;
  status: string;
  created_at?: string;
  pro?: { displayName: string | null } | null;
};

function sortByRecent(a: BookingRow, b: BookingRow): number {
  const ta = a.created_at ? Date.parse(a.created_at) : 0;
  const tb = b.created_at ? Date.parse(b.created_at) : 0;
  return tb - ta;
}

function CustomerBookingsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [active, setActive] = useState<BookingRow[]>([]);
  const [completed, setCompleted] = useState<BookingRow[]>([]);
  const [cancelled, setCancelled] = useState<BookingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<BookingsTab>('active');

  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab === 'completed') setActiveTab('completed');
    else if (tab === 'cancelled') setActiveTab('cancelled');
    else setActiveTab('active');
  }, [searchParams]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      try {
        const [activeRes, completedRes, cancelledRes] = await Promise.all([
          // Do not filter by service_date: "Active" is workflow state (e.g. deposit paid on a past-dated booking still counts).
          fetch(`/api/customer/bookings?limit=50&statuses=${encodeURIComponent(ACTIVE_STATUSES)}`, {
            cache: 'no-store',
          }),
          fetch(
            `/api/customer/bookings?limit=50&statuses=${encodeURIComponent(COMPLETED_STATUSES)}`,
            { cache: 'no-store' }
          ),
          fetch(
            `/api/customer/bookings?limit=50&statuses=${encodeURIComponent(CANCELLED_STATUSES)}`,
            { cache: 'no-store' }
          ),
        ]);

        const activeJson = (await activeRes.json()) as { ok?: boolean; bookings?: BookingRow[] };
        const completedJson = (await completedRes.json()) as { ok?: boolean; bookings?: BookingRow[] };
        const cancelledJson = (await cancelledRes.json()) as { ok?: boolean; bookings?: BookingRow[] };

        if (!mounted) return;
        const act = activeJson.ok && activeJson.bookings ? [...activeJson.bookings].sort(sortByRecent) : [];
        const comp = completedJson.ok && completedJson.bookings ? [...completedJson.bookings].sort(sortByRecent) : [];
        const canc = cancelledJson.ok && cancelledJson.bookings ? [...cancelledJson.bookings].sort(sortByRecent) : [];
        setActive(act);
        setCompleted(comp);
        setCancelled(canc);
      } catch {
        if (!mounted) return;
        setActive([]);
        setCompleted([]);
        setCancelled([]);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  const rows =
    activeTab === 'active' ? active : activeTab === 'completed' ? completed : cancelled;

  return (
    <AppLayout mode="customer">
      <CustomerPageShell title="Bookings">
        <HintManager hintKey="bookings_first_visit" position="top">
        <BookingsTabsLayout
        title="Bookings"
        activeTab={activeTab}
        onTabChange={(t) => {
          setActiveTab(t);
          router.replace(`/customer/bookings?tab=${t}`, { scroll: false });
        }}
      >
        {loading ? (
          <p className="text-sm text-black/60">Loading…</p>
        ) : rows.length === 0 ? (
          <DashboardCard>
            <div className="p-4">
              <p className="font-semibold text-[#111]">
                {activeTab === 'active'
                  ? 'No active bookings'
                  : activeTab === 'completed'
                    ? 'No completed bookings'
                    : 'No cancelled bookings'}
              </p>
              <p className="mt-1 text-sm text-black/60">
                {activeTab === 'active'
                  ? 'When you book a pro, it will show up here.'
                  : activeTab === 'completed'
                    ? 'Your completed bookings will appear here.'
                    : 'Cancelled bookings will appear here.'}
              </p>
              {activeTab === 'active' && (
                <>
                  <Link
                    href="/occupations"
                    className="mt-4 inline-block text-sm font-medium text-[#111] hover:underline"
                  >
                    Browse occupations
                  </Link>
                  <span className="mx-2 text-black/50">·</span>
                  <Link
                    href="/customer/bookings/history"
                    className="mt-4 inline-block text-sm font-medium text-[#111] hover:underline"
                  >
                    View history
                  </Link>
                </>
              )}
            </div>
          </DashboardCard>
        ) : (
          <div className="space-y-3">
            {rows.map((b) => (
              <Link key={b.id} href={`/customer/bookings/${b.id}`} className="block">
                <DashboardCard>
                  <div className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <div className="font-medium text-[#111]">{b.pro?.displayName || 'Service Pro'}</div>
                        <div className="text-sm text-black/60 mt-0.5">
                          {b.service_date} at {b.service_time}
                        </div>
                      </div>
                      <BookingStatusBadge status={b.status} />
                    </div>
                    <div className="mt-3 text-sm text-black/60">
                      View details →
                    </div>
                  </div>
                </DashboardCard>
              </Link>
            ))}
          </div>
        )}
        </BookingsTabsLayout>
        </HintManager>
      </CustomerPageShell>
    </AppLayout>
  );
}

export default function CustomerBookingsPage() {
  return (
    <Suspense
      fallback={
        <AppLayout mode="customer">
          <CustomerPageShell title="Bookings">
            <div className="max-w-4xl mx-auto px-4 py-6">
              <p className="text-sm text-black/60">Loading…</p>
            </div>
          </CustomerPageShell>
        </AppLayout>
      }
    >
      <CustomerBookingsContent />
    </Suspense>
  );
}
