'use client';

/**
 * Booking flow — Summary + Deposit Payment Step
 *
 * STEP 1 — USER INTENT
 * Pay deposit to lock booking. Reduce uncertainty (deposit vs remaining), make next step obvious.
 *
 * STEP 4 — DESIGN SYSTEM
 * Mobile-first, customer pastel green, warm neutral, spacing > borders, soft shadows.
 *
 * STEP 6 — TRUST CHECK
 * Pricing clear, status clear, next step obvious.
 *
 * STEP 7 — PREMIUM CHECK
 * Stripe/Airbnb/Linear quality.
 */

import { AppLayout } from '@/components/layouts/AppLayout';
import Link from 'next/link';
import { Suspense, use, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { BookingSummaryDeposit, type QuoteBreakdown } from '@/components/checkout/BookingSummaryDeposit';
import { DepositPayBar } from '@/components/checkout/DepositPayBar';
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

function CheckoutForm({
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

  const amountCents = quoteData.quote.amountDeposit ?? quoteData.quote.amountRemaining ?? quoteData.quote.amountTotal;
  const isFinal = (quoteData.quote.amountDeposit ?? 0) <= 0 && (quoteData.quote.amountRemaining ?? 0) > 0;

  return (
    <>
      <div
        className="rounded-2xl border border-border bg-surface p-5 shadow-[var(--shadow-card)]"
        role="region"
        aria-labelledby="payment-method-heading"
      >
        <h2 id="payment-method-heading" className="mb-4 text-sm font-medium text-muted">
          Payment method
        </h2>
        <PaymentElement options={{ layout: 'tabs' }} />
      </div>

      <DepositPayBar
        amountCents={amountCents}
        disabled={!stripe || !elements}
        loading={loading}
        onSubmit={handleSubmit}
        label={isFinal ? 'Pay remaining' : 'Pay deposit'}
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

function CheckoutContent({ bookingId }: { bookingId: string }) {
  const searchParams = useSearchParams();
  const phase = searchParams.get('phase');
  const isFinalPayment = phase === 'final';

  const [loading, setLoading] = useState(true);
  const [quoteData, setQuoteData] = useState<QuoteData | null>(null);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [errorStatus, setErrorStatus] = useState<number | null>(null);

  useEffect(() => {
    let mounted = true;
    const run = async () => {
      setLoading(true);
      setError(null);
      setPaymentError(null);
      setErrorStatus(null);

      try {
        if (isFinalPayment) {
          const bookingRes = await fetch(`/api/customer/bookings/${bookingId}`, {
            cache: 'no-store',
            credentials: 'include',
          });
          const bookingJson = await bookingRes.json();
          if (!mounted) return;
          if (!bookingRes.ok) {
            setError(bookingJson.error ?? 'Could not load booking');
            setErrorStatus(bookingRes.status);
            setLoading(false);
            return;
          }
          const b = bookingJson.booking;
          const data: QuoteData = {
            bookingId,
            quote: {
              amountSubtotal: 0,
              amountPlatformFee: 0,
              amountTravelFee: 0,
              amountTotal: 0,
              amountRemaining: b.amountRemaining != null ? b.amountRemaining : 0,
              currency: 'usd',
            },
            serviceName: b.serviceName ?? 'Service',
            proName: b.proName ?? 'Pro',
            serviceDate: b.serviceDate ?? '',
            serviceTime: b.serviceTime ?? '',
          };
          setQuoteData(data);

          const payRes = await fetch(`/api/bookings/${bookingId}/pay/final`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
          });
          const payJson = await payRes.json();
          if (!mounted) return;
          if (!payRes.ok) {
            setError(payJson.error ?? 'Could not start payment');
            setErrorStatus(payRes.status);
            setLoading(false);
            return;
          }
          setClientSecret(payJson.clientSecret ?? null);
          if (payJson.amountRemaining != null) {
            setQuoteData((prev) =>
              prev
                ? {
                    ...prev,
                    quote: {
                      ...prev.quote,
                      amountTotal: payJson.amountRemaining,
                      amountDeposit: 0,
                      amountRemaining: payJson.amountRemaining,
                    },
                  }
                : prev
            );
          }
        } else {
          const payUrl = `/api/bookings/${bookingId}/pay/deposit`;
          const payRes = await fetch(payUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
          });
          const payJson = await payRes.json();

          if (!mounted) return;

          if (!payRes.ok) {
            setError(payJson.error ?? 'Could not load checkout');
            setErrorStatus(payRes.status);
            setLoading(false);
            return;
          }

          const q = payJson.quote;
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
          setClientSecret(payJson.clientSecret ?? null);
        }
      } catch {
        if (mounted) setError('Could not load checkout');
      } finally {
        if (mounted) setLoading(false);
      }
    };
    void run();
    return () => { mounted = false };
  }, [bookingId, isFinalPayment]);

  const pageBg = 'hsl(var(--bg))';
  return (
    <div className="min-h-screen bg-bg" style={{ backgroundColor: pageBg }}>
        <div className="max-w-lg md:max-w-xl mx-auto px-4 md:px-6 py-8 pb-40">
          <Link
            href={`/customer/bookings/${bookingId}`}
            className="mb-6 inline-block text-sm text-muted transition-colors hover:text-primary"
          >
            ← Back to booking
          </Link>

          <h1 className="mb-6 text-2xl font-semibold tracking-tight text-primary">
            {isFinalPayment ? 'Pay remaining balance' : 'Review & pay deposit'}
          </h1>

          {/* LOADING STATE */}
          {loading && (
            <div className="space-y-4 animate-pulse">
              <div className="h-24 rounded-2xl border border-border bg-surface p-6" />
              <div className="h-32 rounded-2xl border border-border bg-surface p-6" />
              <div className="h-40 rounded-2xl border border-border bg-surface p-6" />
              <div className="h-28 rounded-2xl border border-border bg-surface p-6" />
            </div>
          )}

          {/* ERROR STATE */}
          {!loading && error && (
            <div
              className="rounded-2xl border border-border bg-surface p-6 shadow-[var(--shadow-card)]"
              role="alert"
            >
              <p className="mb-2 text-sm font-medium text-primary">
                Something went wrong
              </p>
              <p className="mb-4 text-sm text-muted">{error}</p>
              {errorStatus === 409 && (
                <p className="mb-4 text-xs text-muted">
                  The booking may not be ready for payment yet, or the pro has not completed payout setup.
                </p>
              )}
              {errorStatus === 404 && (
                <p className="mb-4 text-xs text-muted">
                  This booking may not exist or you may not have access to it.
                </p>
              )}
              <Link
                href={`/customer/bookings/${bookingId}`}
                className="inline-flex h-11 items-center justify-center rounded-full border border-[hsl(var(--accent-pro)/0.6)] bg-[hsl(var(--accent-pro))] px-5 text-sm font-semibold text-[hsl(var(--accent-contrast))] transition-colors hover:brightness-95"
              >
                Return to booking
              </Link>
            </div>
          )}

          {/* SUCCESS STATE — redirect happens via Stripe return_url; this is fallback */}
          {/* DEFAULT STATE — summary + payment form */}
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
                      colorPrimary: 'hsl(var(--success))',
                    },
                  },
                }}
              >
                <CheckoutForm
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
            <p className="text-sm text-muted">
              Payment is not configured. Please contact support.
            </p>
          )}
        </div>
      </div>
  );
}

export default function CheckoutPage({
  params,
}: {
  params: Promise<{ bookingId: string }>;
}) {
  const { bookingId } = use(params);
  return (
    <AppLayout mode="customer">
      <Suspense
        fallback={
          <div className="min-h-screen bg-bg" style={{ backgroundColor: 'hsl(var(--bg))' }}>
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
        <CheckoutContent bookingId={bookingId} />
      </Suspense>
    </AppLayout>
  );
}
