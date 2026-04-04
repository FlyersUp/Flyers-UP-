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
import { BookingLoadErrorPage } from '@/components/checkout/BookingLoadErrorPage';
import { QuickRulesSheet } from '@/components/booking/QuickRulesSheet';
import { bookingConfirmedPath } from '@/lib/bookings/booking-routes';

const stripePromise = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
  ? loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY)
  : null;

/** Mirrors server unified payment triple (customer booking API / pay/final). */
type CheckoutPaymentAmounts = {
  totalAmountCents: number;
  paidAmountCents: number;
  remainingAmountCents: number;
};

type QuoteData = {
  bookingId: string;
  quote: QuoteBreakdown;
  /** Canonical pay totals when present; prefer for CTA remaining. */
  paymentAmounts?: CheckoutPaymentAmounts | null;
  serviceName: string;
  proName: string;
  serviceDate: string;
  serviceTime: string;
  address?: string;
  durationHours?: number;
  proPhotoUrl?: string | null;
  paymentDueAt?: string | null;
  minimumBookingNotice?: string | null;
};

/** Single resolved cents for sticky CTA — must not treat deposit 0 as “use deposit” (?? leaves 0). */
function resolveCheckoutPayCents(
  quote: QuoteBreakdown,
  paymentAmounts?: CheckoutPaymentAmounts | null
): number {
  if (paymentAmounts) {
    const t = paymentAmounts.totalAmountCents;
    const p = paymentAmounts.paidAmountCents;
    const r = paymentAmounts.remainingAmountCents;
    if (Number.isFinite(r) && r > 0) return Math.round(r);
    if (Number.isFinite(t) && t > 0 && Number.isFinite(p) && p < t) {
      return Math.max(0, Math.round(t - p));
    }
    if (Number.isFinite(r) && r >= 0) return Math.round(r);
  }
  const deposit = quote.amountDeposit;
  const hasDepositDue = deposit != null && deposit > 0;
  if (hasDepositDue) return deposit;
  const rem = quote.amountRemaining;
  if (rem != null && rem > 0) return rem;
  const total = quote.amountTotal ?? 0;
  return total;
}

function isFinalCheckoutPhase(quote: QuoteBreakdown): boolean {
  const deposit = quote.amountDeposit;
  const hasDepositDue = deposit != null && deposit > 0;
  return !hasDepositDue && (quote.amountRemaining ?? 0) > 0;
}

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
  const isFinal = isFinalCheckoutPhase(quoteData.quote);

  const doSubmit = async () => {
    if (!stripe || !elements) return;

    setLoading(true);
    onPaymentError('');

    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://www.flyersup.app';
    const returnUrl = `${origin}${bookingConfirmedPath(bookingId, { phase: isFinal ? 'final' : undefined })}`;

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

  const amountCents = resolveCheckoutPayCents(quoteData.quote, quoteData.paymentAmounts);

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
  const [retryKey, setRetryKey] = useState(0);

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
          const b = bookingJson.booking as {
            amountRemaining?: number | null;
            amountTotal?: number | null;
            paidAmountCents?: number | null;
            serviceName?: string;
            proName?: string;
            serviceDate?: string;
            serviceTime?: string;
          };
          const total =
            typeof b.amountTotal === 'number' && Number.isFinite(b.amountTotal) ? Math.round(b.amountTotal) : 0;
          const paid =
            typeof b.paidAmountCents === 'number' && Number.isFinite(b.paidAmountCents)
              ? Math.round(b.paidAmountCents)
              : 0;
          const remaining =
            typeof b.amountRemaining === 'number' && Number.isFinite(b.amountRemaining)
              ? Math.round(b.amountRemaining)
              : 0;
          const paymentAmounts: CheckoutPaymentAmounts | null =
            total > 0 ? { totalAmountCents: total, paidAmountCents: paid, remainingAmountCents: remaining } : null;

          if (process.env.NODE_ENV === 'development' && total > 0 && paid < total && remaining === 0) {
            console.warn(
              '[checkout] Inconsistent payment snapshot from booking GET (total > paid but remaining is 0)',
              { bookingId, total, paid, remaining }
            );
          }

          const data: QuoteData = {
            bookingId,
            paymentAmounts,
            quote: {
              amountSubtotal: 0,
              amountPlatformFee: 0,
              amountTravelFee: 0,
              amountTotal: total,
              amountRemaining: remaining,
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
          if (typeof payJson.minimumBookingNotice === 'string' && payJson.minimumBookingNotice.trim()) {
            setQuoteData((prev) =>
              prev ? { ...prev, minimumBookingNotice: payJson.minimumBookingNotice } : prev
            );
          }
          const pa = payJson.paymentAmounts as Partial<CheckoutPaymentAmounts> | undefined;
          if (
            pa &&
            typeof pa.remainingAmountCents === 'number' &&
            Number.isFinite(pa.remainingAmountCents)
          ) {
            const nextTotal =
              typeof pa.totalAmountCents === 'number' && pa.totalAmountCents > 0
                ? Math.round(pa.totalAmountCents)
                : undefined;
            const nextPaid =
              typeof pa.paidAmountCents === 'number' && Number.isFinite(pa.paidAmountCents)
                ? Math.round(pa.paidAmountCents)
                : undefined;
            const nextRemaining = Math.round(pa.remainingAmountCents);
            setQuoteData((prev) => {
              if (!prev) return prev;
              const total = nextTotal ?? prev.paymentAmounts?.totalAmountCents ?? prev.quote.amountTotal;
              const paid = nextPaid ?? prev.paymentAmounts?.paidAmountCents ?? 0;
              if (process.env.NODE_ENV === 'development' && total > 0 && paid < total && nextRemaining === 0) {
                console.warn(
                  '[checkout] Inconsistent payment snapshot after pay/final (total > paid but remaining is 0)',
                  { bookingId, total, paid, remaining: nextRemaining }
                );
              }
              return {
                ...prev,
                paymentAmounts: {
                  totalAmountCents: total,
                  paidAmountCents: paid,
                  remainingAmountCents: nextRemaining,
                },
                quote: {
                  ...prev.quote,
                  amountTotal: nextTotal ?? prev.quote.amountTotal,
                  // Omit deposit for final phase so we never use `0 ?? remaining` bug on CTA
                  amountDeposit: undefined,
                  amountRemaining: nextRemaining,
                },
              };
            });
          } else if (payJson.amountRemaining != null) {
            const arRaw = Math.round(Number(payJson.amountRemaining));
            setQuoteData((prev) => {
              if (!prev) return prev;
              // Legacy pay/final without paymentAmounts: never clobber booking GET remaining with 0
              const prevRem =
                prev.paymentAmounts?.remainingAmountCents ?? prev.quote.amountRemaining ?? null;
              const prevTotal =
                prev.paymentAmounts?.totalAmountCents ?? prev.quote.amountTotal ?? 0;
              const prevPaid = prev.paymentAmounts?.paidAmountCents ?? 0;
              const ar =
                arRaw === 0 &&
                typeof prevRem === 'number' &&
                prevRem > 0 &&
                prevTotal > 0 &&
                prevPaid < prevTotal
                  ? prevRem
                  : arRaw;
              if (ar !== arRaw) {
                return {
                  ...prev,
                  paymentAmounts:
                    prev.paymentAmounts ??
                    (prevTotal > 0
                      ? {
                          totalAmountCents: prevTotal,
                          paidAmountCents: Math.max(0, prevTotal - ar),
                          remainingAmountCents: ar,
                        }
                      : undefined),
                  quote: {
                    ...prev.quote,
                    amountDeposit: undefined,
                    amountRemaining: ar,
                  },
                };
              }
              return {
                ...prev,
                paymentAmounts: {
                  totalAmountCents: prevTotal,
                  paidAmountCents: Math.max(0, prevTotal - ar),
                  remainingAmountCents: ar,
                },
                quote: {
                  ...prev.quote,
                  amountDeposit: undefined,
                  amountRemaining: ar,
                },
              };
            });
          }
        } else {
          // Pre-check: ensure we can access the booking before deposit API
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
          const minNoticeDep =
            (typeof payJson.minimumBookingNotice === 'string' && payJson.minimumBookingNotice) ||
            (q && typeof (q as { minimumBookingNotice?: string }).minimumBookingNotice === 'string'
              ? (q as { minimumBookingNotice: string }).minimumBookingNotice
              : null) ||
            null;
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
              minimumBookingNotice: minNoticeDep,
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
  }, [bookingId, isFinalPayment, retryKey]);

  return (
    <div className="min-h-screen bg-[#f7f7f7] dark:bg-[#0d0d0f]">
        <div className="max-w-lg md:max-w-xl mx-auto px-4 md:px-6 py-6 pb-fu-sticky-only">
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
            {isFinalPayment ? 'Pay remaining balance' : 'Review & pay deposit'}
          </h1>

          {/* LOADING STATE */}
          {loading && (
            <div className="space-y-4 animate-pulse">
              <div className="h-24 rounded-2xl bg-white/80 dark:bg-white/5" />
              <div className="h-20 rounded-2xl bg-white/80 dark:bg-white/5" />
              <div className="h-48 rounded-2xl bg-white/80 dark:bg-white/5" />
              <div className="h-36 rounded-2xl bg-white/80 dark:bg-white/5" />
            </div>
          )}

          {/* ERROR STATE — premium Apple/Uber/Airbnb style */}
          {!loading && error && (
            <BookingLoadErrorPage
              title="Couldn't load this booking"
              message={error}
              errorStatus={errorStatus}
              primaryHref={`/customer/bookings/${bookingId}`}
              primaryLabel="Return to booking"
              secondaryHref="/customer/bookings"
              secondaryLabel="View all bookings"
              signInHref={
                errorStatus === 401
                  ? `/auth?next=${encodeURIComponent(`/bookings/${bookingId}/checkout`)}`
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
              minimumBookingNotice={quoteData.minimumBookingNotice}
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
                    window.location.href = bookingConfirmedPath(bookingId, {
                      phase: isFinalPayment ? 'final' : undefined,
                    });
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
          <div className="min-h-screen bg-[#f7f7f7] dark:bg-[#0d0d0f]">
            <div className="max-w-lg md:max-w-xl mx-auto px-4 md:px-6 py-8 pb-fu-sticky-only">
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
