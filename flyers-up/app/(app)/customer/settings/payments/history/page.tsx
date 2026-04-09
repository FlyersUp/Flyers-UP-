'use client';

import { useEffect, useState } from 'react';
import { PaymentsSubpageShell } from '@/components/customer/payments/PaymentsSubpageShell';
import { FinancialHealthHero } from '@/components/customer/payments/FinancialHealthHero';
import { PaymentActivityCard } from '@/components/customer/payments/PaymentActivityCard';
import { SpendingInsightCard } from '@/components/customer/payments/SpendingInsightCard';
import { CommunityImpactCard } from '@/components/customer/payments/CommunityImpactCard';
import { SignInNotice } from '@/components/ui/SignInNotice';
import { getCurrentUser } from '@/lib/api';
import {
  bookingToPaymentActivityItem,
  bookingsToPaymentActivities,
  sumPaidActivitiesForMonth,
  countUniqueProsInMonth,
} from '@/lib/customer/payment-activity';

type BookingApiRow = Parameters<typeof bookingToPaymentActivityItem>[0];

export default function CustomerPaymentHistoryPage() {
  const [loading, setLoading] = useState(true);
  const [signedIn, setSignedIn] = useState(false);
  const [rows, setRows] = useState<BookingApiRow[]>([]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      const user = await getCurrentUser();
      if (!mounted) return;
      if (!user) {
        setSignedIn(false);
        setRows([]);
        setLoading(false);
        return;
      }
      setSignedIn(true);
      try {
        const res = await fetch('/api/customer/bookings?sort=created_desc&limit=80&payments=1', { cache: 'no-store' });
        const json = await res.json();
        if (!mounted) return;
        if (res.ok && json.ok && Array.isArray(json.bookings)) {
          setRows(json.bookings as BookingApiRow[]);
        } else {
          setRows([]);
        }
      } catch {
        if (mounted) setRows([]);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const activities = bookingsToPaymentActivities(rows);
  const ym = new Date().toISOString().slice(0, 7);
  const { cents, label } = sumPaidActivitiesForMonth(activities, ym);
  const totalLabel =
    cents > 0
      ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cents / 100)
      : '$0.00';
  const prosSupported = countUniqueProsInMonth(
    rows.map((r) => ({ service_date: r.service_date, pro_id: r.pro_id })),
    ym
  );

  return (
    <PaymentsSubpageShell backHref="/customer/settings/payments" backLabel="Payments">
      <header className="mt-4">
        <h1 className="text-2xl font-bold text-text sm:text-[1.65rem]">Financial activity</h1>
        <p className="mt-1 text-sm text-text2">Your neighborhood service payments at a glance.</p>
      </header>

      <div className="mt-6 space-y-8">
        <FinancialHealthHero />

        {!signedIn ? (
          <SignInNotice nextHref="/customer/settings/payments/history" />
        ) : loading ? (
          <p className="text-sm text-text2">Loading activity…</p>
        ) : activities.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-surface2/40 px-5 py-10 text-center">
            <p className="font-medium text-text">No payment activity yet</p>
            <p className="mt-2 text-sm text-text2">
              When you book and pay a pro, deposits and final payments will show up here.
            </p>
          </div>
        ) : (
          <>
            <section>
              <h2 className="mb-3 text-base font-bold text-text">Recent activity</h2>
              <ul className="space-y-3">
                {activities.map((item) => (
                  <li key={item.bookingId}>
                    <PaymentActivityCard item={item} href={`/customer/bookings/${item.bookingId}`} />
                  </li>
                ))}
              </ul>
            </section>

            <SpendingInsightCard monthLabel={label} totalLabel={totalLabel} />

            {prosSupported > 0 ? (
              <CommunityImpactCard prosSupported={prosSupported} monthLabel={label.split(' ')[0] ?? 'this month'} />
            ) : null}
          </>
        )}
      </div>
    </PaymentsSubpageShell>
  );
}
