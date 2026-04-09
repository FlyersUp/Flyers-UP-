'use client';

import { useEffect, useState } from 'react';
import { PaymentsSubpageShell } from '@/components/customer/payments/PaymentsSubpageShell';
import { FinancialHealthHero } from '@/components/customer/payments/FinancialHealthHero';
import { RefundStatusCard } from '@/components/customer/payments/RefundStatusCard';
import { SignInNotice } from '@/components/ui/SignInNotice';
import { getCurrentUser } from '@/lib/api';
import { bookingToRefundRow } from '@/lib/customer/payment-activity';

type Row = Parameters<typeof bookingToRefundRow>[0];

export default function CustomerPaymentRefundsPage() {
  const [loading, setLoading] = useState(true);
  const [signedIn, setSignedIn] = useState(false);
  const [refunds, setRefunds] = useState<NonNullable<ReturnType<typeof bookingToRefundRow>>[]>([]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      const user = await getCurrentUser();
      if (!mounted) return;
      if (!user) {
        setSignedIn(false);
        setRefunds([]);
        setLoading(false);
        return;
      }
      setSignedIn(true);
      try {
        const res = await fetch('/api/customer/bookings?sort=created_desc&limit=80&payments=1', { cache: 'no-store' });
        const json = await res.json();
        if (!mounted) return;
        const bookings: Row[] = res.ok && json.ok && Array.isArray(json.bookings) ? json.bookings : [];
        const list = bookings.map((b) => bookingToRefundRow(b)).filter(Boolean) as NonNullable<
          ReturnType<typeof bookingToRefundRow>
        >[];
        setRefunds(list);
      } catch {
        if (mounted) setRefunds([]);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <PaymentsSubpageShell backHref="/customer/settings/payments" backLabel="Payments">
      <header className="mt-4">
        <h1 className="text-2xl font-bold text-text sm:text-[1.65rem]">Refunds</h1>
        <p className="mt-1 text-sm text-text2">Track refunds issued for your bookings.</p>
      </header>

      <div className="mt-6 space-y-6">
        <FinancialHealthHero
          title="Refund status"
          subtitle="Refunds follow our cancellation and dispute policies. Open a booking for full details."
        />

        {!signedIn ? (
          <SignInNotice nextHref="/customer/settings/payments/refunds" />
        ) : loading ? (
          <p className="text-sm text-text2">Loading refunds…</p>
        ) : refunds.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-surface2/40 px-5 py-10 text-center">
            <p className="font-medium text-text">No refunds</p>
            <p className="mt-2 text-sm text-text2">
              When a refund is processed for a booking, it will appear here with status and amounts.
            </p>
          </div>
        ) : (
          <ul className="space-y-4">
            {refunds.map((row) => (
              <li key={row.bookingId}>
                <RefundStatusCard row={row} />
              </li>
            ))}
          </ul>
        )}

        <p className="text-center text-xs text-text3">
          Questions?{' '}
          <a href="/customer/settings/help-support" className="font-medium text-[hsl(var(--accent-customer))] underline">
            Contact support
          </a>
        </p>
      </div>
    </PaymentsSubpageShell>
  );
}
