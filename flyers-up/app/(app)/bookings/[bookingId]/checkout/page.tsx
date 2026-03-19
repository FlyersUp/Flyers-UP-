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
import { use, useEffect, useState } from 'react';
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
        className="rounded-2xl border border-black/5 dark:border-white/10 bg-white dark:bg-[#171A20] p-5 shadow-sm"
        role="region"
        aria-labelledby="payment-method-heading"
      >
        <h2 id="payment-method-heading" className="text-sm font-medium text-[#6A6A6A] dark:text-[#A1A8B3] mb-4">
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

export default function CheckoutPage({
  params,
}: {
  params: Promise<{ bookingId: string }>;
}) {
  const { bookingId } = use(params);
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
          const bookingRes = await fetch(`/api/customer/bookings/${bookingId}`, { cache: 'no-store' });
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
    <AppLayout mode="customer">
      <div className="min-h-screen bg-bg" style={{ backgroundColor: pageBg }}>
        <div className="max-w-lg md:max-w-xl mx-auto px-4 md:px-6 py-8 pb-40">
          <Link
            href={`/customer/bookings/${bookingId}`}
            className="text-sm text-[#6A6A6A] dark:text-[#A1A8B3] hover:text-[#111111] dark:hover:text-[#F5F7FA] mb-6 inline-block transition-colors"
          >
            ← Back to booking
          </Link>

          <h1 className="text-2xl font-semibold text-[#111111] dark:text-[#F5F7FA] mb-6 tracking-tight">
            {isFinalPayment ? 'Pay remaining balance' : 'Review & pay deposit'}
          </h1>

          {/* LOADING STATE */}
          {loading && (
            <div className="space-y-4 animate-pulse">
              <div className="rounded-2xl border border-black/5 dark:border-white/10 bg-white dark:bg-[#171A20] p-6 h-24" />
              <div className="rounded-2xl border border-black/5 dark:border-white/10 bg-white dark:bg-[#171A20] p-6 h-32" />
              <div className="rounded-2xl border border-black/5 dark:border-white/10 bg-white dark:bg-[#171A20] p-6 h-40" />
              <div className="rounded-2xl border border-black/5 dark:border-white/10 bg-white dark:bg-[#171A20] p-6 h-28" />
            </div>
          )}

          {/* ERROR STATE */}
          {!loading && error && (
            <div
              className="rounded-2xl border border-black/10 dark:border-white/10 bg-white dark:bg-[#171A20] p-6 shadow-sm"
              role="alert"
            >
              <p className="text-sm font-medium text-[#111111] dark:text-[#F5F7FA] mb-2">
                Something went wrong
              </p>
              <p className="text-sm text-[#6A6A6A] dark:text-[#A1A8B3] mb-4">{error}</p>
              {errorStatus === 409 && (
                <p className="text-xs text-[#6A6A6A] dark:text-[#A1A8B3] mb-4">
                  The booking may not be ready for payment yet, or the pro has not completed payout setup.
                </p>
              )}
              {errorStatus === 404 && (
                <p className="text-xs text-[#6A6A6A] dark:text-[#A1A8B3] mb-4">
                  This booking may not exist or you may not have access to it.
                </p>
              )}
              <Link
                href={`/customer/bookings/${bookingId}`}
                className="inline-flex items-center justify-center h-11 px-5 rounded-full text-sm font-semibold bg-[#058954] text-white hover:bg-[#047a48] transition-colors"
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
                      colorPrimary: '#058954',
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
            <p className="text-sm text-[#6A6A6A] dark:text-[#A1A8B3]">
              Payment is not configured. Please contact support.
            </p>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
