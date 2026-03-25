'use client';

/**
 * Customer deposit checkout — dedicated page for paying the deposit.
 *
 * Flow: load booking → verify ownership → create intent → Stripe PaymentElement → confirm → success.
 */

import { AppLayout } from '@/components/layouts/AppLayout';
import Link from 'next/link';
import { Suspense, use, useEffect, useState } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { BookingSummaryDeposit, type QuoteBreakdown } from '@/components/checkout/BookingSummaryDeposit';
import { DepositPayBar } from '@/components/checkout/DepositPayBar';
import { BookingLoadErrorPage } from '@/components/checkout/BookingLoadErrorPage';
import { QuickRulesSheet } from '@/components/booking/QuickRulesSheet';
const stripePromise = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
  ? loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY)
  : null;

type QuoteData = {
  bookingId: string;
  quote: QuoteBreakdown;
  serviceName: string;
  proName: string;
  serviceDate: string;
  serviceTime: string;
  address?: string;
  durationHours?: number;
  proPhotoUrl?: string | null;
  paymentDueAt?: string | null;
};

function DepositPaymentForm({
  bookingId,
  quoteData,
  onSuccess,
  onPaymentError,
}: {
  bookingId: string;
  quoteData: QuoteData;
  onSuccess: () => void;
  onPaymentError: (message: string) => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);
  const [quickRulesOpen, setQuickRulesOpen] = useState(false);

  const doSubmit = async () => {
    if (!stripe || !elements) return;

    setLoading(true);
    onPaymentError('');

    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://www.flyersup.app';
    const returnUrl = `${origin}/bookings/${bookingId}/confirmed`;

    const { error: confirmError } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: returnUrl,
        receipt_email: undefined,
      },
    });

    setLoading(false);

    if (confirmError) {
      onPaymentError(confirmError.message ?? 'Payment failed');
      return;
    }

    onSuccess();
  };

  const handleSubmit = async () => {
    const { hasSeenQuickRules } = await import('@/components/booking/QuickRulesSheet');
    if (!hasSeenQuickRules()) {
      setQuickRulesOpen(true);
      return;
    }
    await doSubmit();
  };

  const handleQuickRulesContinue = () => {
    setQuickRulesOpen(false);
    void doSubmit();
  };

  const amountCents = quoteData.quote.amountDeposit ?? quoteData.quote.amountTotal;

  return (
    <>
      <div
        className="rounded-2xl bg-white dark:bg-[#1a1d24] p-5 shadow-[0_1px_3px_rgba(0,0,0,0.06)] dark:shadow-[0_1px_3px_rgba(0,0,0,0.2)]"
        role="region"
        aria-labelledby="payment-method-heading"
      >
        <h2 id="payment-method-heading" className="mb-4 text-sm font-medium text-[#222] dark:text-white">
          Payment method
        </h2>
        <PaymentElement options={{ layout: 'tabs' }} />
      </div>

      <DepositPayBar
        amountCents={amountCents}
        disabled={!stripe || !elements}
        loading={loading}
        onSubmit={handleSubmit}
        label="Pay deposit"
        backHref={`/customer/bookings/${bookingId}`}
        showBookingRulesLink
      />

      <QuickRulesSheet
        open={quickRulesOpen}
        onContinue={handleQuickRulesContinue}
        onClose={() => setQuickRulesOpen(false)}
      />
    </>
  );
}

function DepositContent({ bookingId }: { bookingId: string }) {
  const [loading, setLoading] = useState(true);
  const [quoteData, setQuoteData] = useState<QuoteData | null>(null);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [errorStatus, setErrorStatus] = useState<number | null>(null);
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    let mounted = true;
    const run = async () => {
      setLoading(true);
      setError(null);
      setPaymentError(null);
      setErrorStatus(null);

      try {
        // 1. Pre-check: verify booking access
        const preCheckRes = await fetch(`/api/customer/bookings/${bookingId}`, {
          cache: 'no-store',
          credentials: 'include',
        });
        if (!mounted) return;
        if (!preCheckRes.ok) {
          const preJson = await preCheckRes.json().catch(() => ({}));
          setError(preJson.error ?? 'Could not load booking');
          setErrorStatus(preCheckRes.status);
          if (preCheckRes.status === 401) {
            setError('Session may have expired. Please sign in again.');
          }
          setLoading(false);
          return;
        }

        // 2. Create deposit PaymentIntent
        const intentRes = await fetch(`/api/bookings/${bookingId}/deposit/create-intent`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
        });
        const intentJson = await intentRes.json();

        if (!mounted) return;

        if (!intentRes.ok) {
          const msg = intentJson.error ?? 'Could not start payment';
          setError(msg);
          setErrorStatus(intentRes.status);
          setLoading(false);
          return;
        }

        const q = intentJson.quote;
        if (q) {
          setQuoteData({
            bookingId,
            quote: q.quote ?? q,
            serviceName: q.serviceName ?? 'Service',
            proName: q.proName ?? 'Pro',
            serviceDate: q.serviceDate ?? '',
            serviceTime: q.serviceTime ?? '',
            address: q.address,
            durationHours: q.durationHours,
            proPhotoUrl: q.proPhotoUrl ?? null,
            paymentDueAt: q.paymentDueAt ?? null,
          });
        }
        setClientSecret(intentJson.clientSecret ?? null);
      } catch {
        if (mounted) setError('Failed to initialize payment');
      } finally {
        if (mounted) setLoading(false);
      }
    };
    void run();
    return () => { mounted = false };
  }, [bookingId, retryKey]);

  return (
    <div className="min-h-screen bg-[#f7f7f7] dark:bg-[#0d0d0f]">
      <div className="max-w-lg md:max-w-xl mx-auto px-4 md:px-6 py-6 pb-44">
        <Link
          href={`/customer/bookings/${bookingId}`}
          className="mb-6 inline-flex items-center gap-1 text-sm text-[#717171] dark:text-white/60 hover:text-[#222] dark:hover:text-white transition-colors"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="-ml-0.5">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
          Back to booking
        </Link>

        <h1 className="mb-6 text-[1.5rem] font-semibold tracking-tight text-[#222] dark:text-white">
          Pay deposit
        </h1>

        {loading && (
          <div className="space-y-4 animate-pulse">
            <div className="h-24 rounded-2xl bg-white/80 dark:bg-white/5" />
            <div className="h-20 rounded-2xl bg-white/80 dark:bg-white/5" />
            <div className="h-48 rounded-2xl bg-white/80 dark:bg-white/5" />
            <div className="h-36 rounded-2xl bg-white/80 dark:bg-white/5" />
          </div>
        )}

        {!loading && error && (
          <BookingLoadErrorPage
            title={
              errorStatus === 404
                ? 'Booking not found'
                : errorStatus === 401
                  ? 'Sign in required'
                  : 'Couldn\'t load this booking'
            }
            message={error}
            errorStatus={errorStatus}
            primaryHref={`/customer/bookings/${bookingId}`}
            primaryLabel="Return to booking"
            secondaryHref="/customer/bookings"
            secondaryLabel="View all bookings"
            signInHref={
              errorStatus === 401
                ? `/auth?next=${encodeURIComponent(`/customer/bookings/${bookingId}/deposit`)}`
                : undefined
            }
            onRetry={() => {
              setError(null);
              setErrorStatus(null);
              setLoading(true);
              setRetryKey((k) => k + 1);
            }}
            compact={false}
          />
        )}

        {!loading && !error && quoteData && clientSecret && stripePromise && (
          <BookingSummaryDeposit
            proName={quoteData.proName}
            proPhotoUrl={quoteData.proPhotoUrl ?? null}
            serviceName={quoteData.serviceName}
            serviceDate={quoteData.serviceDate}
            serviceTime={quoteData.serviceTime}
            address={quoteData.address}
            durationHours={quoteData.durationHours}
            quote={quoteData.quote}
            paymentDueAt={quoteData.paymentDueAt}
          >
            {paymentError && (
              <div
                className="rounded-xl border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-950/30 p-4"
                role="alert"
              >
                <p className="text-sm font-medium text-red-700 dark:text-red-400">{paymentError}</p>
                <p className="text-xs text-red-600 dark:text-red-500 mt-1">
                  Please check your payment method and try again.
                </p>
              </div>
            )}

            <Elements
              stripe={stripePromise}
              options={{
                clientSecret,
                appearance: {
                  theme: 'stripe',
                  variables: {
                    borderRadius: '12px',
                    colorPrimary: '#058954',
                  },
                },
              }}
            >
              <DepositPaymentForm
                bookingId={bookingId}
                quoteData={quoteData}
                onSuccess={() => {
                  window.location.href = `/bookings/${bookingId}/confirmed`;
                }}
                onPaymentError={setPaymentError}
              />
            </Elements>
          </BookingSummaryDeposit>
        )}

        {!loading && !error && !quoteData && !clientSecret && stripePromise === null && (
          <p className="text-sm text-[#717171] dark:text-white/60">
            Payment is not configured. Please contact support.
          </p>
        )}
      </div>
    </div>
  );
}

export default function DepositPage({
  params,
}: {
  params: Promise<{ bookingId: string }>;
}) {
  const { bookingId } = use(params);
  return (
    <AppLayout mode="customer">
      <Suspense
        fallback={
          <div className="min-h-screen bg-[#f7f7f7] dark:bg-[#0d0d0f]">
            <div className="max-w-lg md:max-w-xl mx-auto px-4 md:px-6 py-8 pb-40">
              <div className="h-4 w-48 rounded bg-surface mb-6" />
              <div className="h-8 w-64 rounded bg-surface mb-6" />
              <div className="space-y-4 animate-pulse">
                <div className="h-24 rounded-2xl border border-border bg-surface p-6" />
                <div className="h-32 rounded-2xl border border-border bg-surface p-6" />
                <div className="h-40 rounded-2xl border border-border bg-surface p-6" />
              </div>
            </div>
          </div>
        }
      >
        <DepositContent bookingId={bookingId} />
      </Suspense>
    </AppLayout>
  );
}
