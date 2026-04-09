'use client';

import { useEffect, useState } from 'react';
import { PaymentsSubpageShell } from '@/components/customer/payments/PaymentsSubpageShell';
import { FinancialHealthHero } from '@/components/customer/payments/FinancialHealthHero';
import { ReceiptCard, type ReceiptListItem } from '@/components/customer/payments/ReceiptCard';
import { SignInNotice } from '@/components/ui/SignInNotice';
import { getCurrentUser } from '@/lib/api';
import { bookingToPaymentActivityItem } from '@/lib/customer/payment-activity';

type Row = Parameters<typeof bookingToPaymentActivityItem>[0];

const PAIDISH = new Set([
  'deposit_paid',
  'fully_paid',
  'completed',
  'in_progress',
  'on_the_way',
  'pro_en_route',
]);

export default function CustomerPaymentReceiptsPage() {
  const [loading, setLoading] = useState(true);
  const [signedIn, setSignedIn] = useState(false);
  const [items, setItems] = useState<ReceiptListItem[]>([]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      const user = await getCurrentUser();
      if (!mounted) return;
      if (!user) {
        setSignedIn(false);
        setItems([]);
        setLoading(false);
        return;
      }
      setSignedIn(true);
      try {
        const res = await fetch('/api/customer/bookings?sort=created_desc&limit=80&payments=1', { cache: 'no-store' });
        const json = await res.json();
        if (!mounted) return;
        const bookings: Row[] = res.ok && json.ok && Array.isArray(json.bookings) ? json.bookings : [];
        const receipts: ReceiptListItem[] = [];
        for (const b of bookings) {
          const st = String(b.status ?? '').toLowerCase();
          if (!PAIDISH.has(st)) continue;
          const act = bookingToPaymentActivityItem(b);
          receipts.push({
            bookingId: b.id,
            serviceName: act.serviceName,
            proName: act.proName,
            serviceDate: b.service_date,
            amountLabel: act.amountLabel,
            reference: b.id.length >= 8 ? b.id.replace(/-/g, '').slice(0, 12).toUpperCase() : null,
          });
        }
        setItems(receipts);
      } catch {
        if (mounted) setItems([]);
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
        <h1 className="text-2xl font-bold text-text sm:text-[1.65rem]">Receipts</h1>
        <p className="mt-1 text-sm text-text2">Proof of payment for completed charges.</p>
      </header>

      <div className="mt-6 space-y-6">
        <FinancialHealthHero
          title="Receipt library"
          subtitle="Download or view a printable receipt for any job you’ve paid toward."
        />

        {!signedIn ? (
          <SignInNotice nextHref="/customer/settings/payments/receipts" />
        ) : loading ? (
          <p className="text-sm text-text2">Loading receipts…</p>
        ) : items.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-surface2/40 px-5 py-10 text-center">
            <p className="font-medium text-text">No receipts available yet</p>
            <p className="mt-2 text-sm text-text2">
              After you pay a deposit or final payment, receipts will appear here for that booking.
            </p>
          </div>
        ) : (
          <ul className="space-y-4">
            {items.map((item) => (
              <li key={item.bookingId}>
                <ReceiptCard item={item} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </PaymentsSubpageShell>
  );
}
