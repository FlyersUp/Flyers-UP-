import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { AppLayout } from '@/components/layouts/AppLayout';
import { buildPaymentHeldUiState } from '@/lib/bookings/payment-held-ui-state';
import {
  PaymentHeldCustomerCard,
  PaymentHeldProCard,
  PaymentHeldRoleSection,
  PaymentHoldWhyCallout,
} from '@/components/payments/payment-held';

export const metadata: Metadata = {
  robots: { index: false, follow: false },
  title: 'Payment held — UI preview',
};

/**
 * Static demo of the payment-held / under-review layout (pro + customer + callout).
 * For design QA only; not linked from production navigation.
 */
export default function PaymentHeldPreviewPage() {
  const proState = buildPaymentHeldUiState({
    view: 'pro',
    holdReason: 'fraud_review',
    context: { suspiciousCompletion: true, suspiciousCompletionReason: 'too_fast' },
  });
  const customerState = buildPaymentHeldUiState({
    view: 'customer',
    holdReason: 'fraud_review',
    context: { suspiciousCompletion: true, suspiciousCompletionReason: 'too_fast' },
  });
  const why = customerState.whyCallout;

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
          <PaymentHeldProCard state={proState} detailsHref="/pro/bookings" supportHref="/support" />
        </PaymentHeldRoleSection>

        <div className="my-10 h-px bg-border/70" aria-hidden />

        <PaymentHeldRoleSection roleLabel="Customer view" badge="Under review">
          <PaymentHeldCustomerCard
            state={customerState}
            bookingHref="/customer/bookings"
            supportHref="/support"
          />
        </PaymentHeldRoleSection>

        {why ? (
          <PaymentHoldWhyCallout className="mt-6" headline={why.headline} body={why.body} />
        ) : null}
      </div>
    </AppLayout>
  );
}
