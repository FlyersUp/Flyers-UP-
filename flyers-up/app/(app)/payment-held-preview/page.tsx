import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { AppLayout } from '@/components/layouts/AppLayout';
import { getMoneyState } from '@/lib/bookings/money-state';
import { getMoneyPresentation } from '@/lib/bookings/money-presentation';
import {
  PaymentHeldCustomerCard,
  PaymentHeldProCard,
  PaymentHeldRoleSection,
} from '@/components/payments/payment-held';

export const metadata: Metadata = {
  robots: { index: false, follow: false },
  title: 'Payment held — UI preview',
};

const PREVIEW_DEPOSIT = '2024-06-01T10:00:00.000Z';
const PREVIEW_COMPLETED = '2024-06-14T10:00:00.000Z';
const PREVIEW_FINAL = '2024-06-15T10:00:00.000Z';

/**
 * Static demo of the payment-held / under-review layout (pro + customer + callout).
 * For design QA only; not linked from production navigation.
 */
export default function PaymentHeldPreviewPage() {
  const holdSignals = {
    payoutReleased: false as boolean | null,
    paymentLifecycleStatus: 'payout_on_hold',
    suspiciousCompletion: true as boolean | null,
    suspiciousCompletionReason: 'too_fast' as string | null,
  };

  const previewMoney = getMoneyState(
    {
      status: 'fully_paid',
      paymentLifecycleStatus: 'payout_on_hold',
      payoutReleased: false,
      finalPaymentStatus: 'PAID',
      paidDepositAt: PREVIEW_DEPOSIT,
      paidAt: PREVIEW_DEPOSIT,
      paidRemainingAt: PREVIEW_FINAL,
      fullyPaidAt: PREVIEW_FINAL,
      completedAt: PREVIEW_COMPLETED,
      amountRemaining: 0,
    },
    {}
  );

  const heldTimelineTimestamps = {
    deposit: PREVIEW_DEPOSIT,
    completed: PREVIEW_COMPLETED,
  };

  const proPresentation = getMoneyPresentation(previewMoney, 'pro', {
    holdSignals,
    heldTimelineTimestamps,
  });
  const customerPresentation = getMoneyPresentation(previewMoney, 'customer', {
    holdSignals,
    heldTimelineTimestamps,
  });

  return (
    <AppLayout mode="customer" showFloatingNotificationBell={false}>
      <div className="mx-auto min-h-dvh max-w-lg bg-bg px-4 py-5 pb-12">
        <header className="mb-6 flex items-center gap-3">
          <Link
            href="/customer/bookings"
            className="rounded-full p-1 text-trust transition-colors hover:bg-trust/10"
            aria-label="Back"
          >
            <ArrowLeft className="h-6 w-6" strokeWidth={2} />
          </Link>
          <h1 className="text-xl font-bold text-trust">Payment Details</h1>
        </header>

        <PaymentHeldRoleSection roleLabel="Professional view">
          <PaymentHeldProCard
            presentation={proPresentation}
            detailsHref="/pro/bookings"
            supportHref="/support"
          />
        </PaymentHeldRoleSection>

        <div className="my-10 h-px bg-border/70" aria-hidden />

        <PaymentHeldRoleSection roleLabel="Customer view" badge="Under review">
          <PaymentHeldCustomerCard
            presentation={customerPresentation}
            bookingHref="/customer/bookings"
            supportHref="/support"
          />
        </PaymentHeldRoleSection>
      </div>
    </AppLayout>
  );
}
