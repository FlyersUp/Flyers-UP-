'use client';

import { AppLayout } from '@/components/layouts/AppLayout';
import Link from 'next/link';
import { use, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';

function CountdownTimer({ paymentDueAt }: { paymentDueAt: string }) {
  const [remaining, setRemaining] = useState<string>('');

  useEffect(() => {
    const update = () => {
      const due = new Date(paymentDueAt).getTime();
      const now = Date.now();
      const diff = Math.max(0, due - now);
      if (diff <= 0) {
        setRemaining('Expired');
        return;
      }
      const m = Math.floor(diff / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setRemaining(`${m}:${s.toString().padStart(2, '0')}`);
    };
    update();
    const t = setInterval(update, 1000);
    return () => clearInterval(t);
  }, [paymentDueAt]);

  if (!remaining) return null;
  return (
    <p className="text-sm text-amber-700 mt-2">
      Time to pay: {remaining}
    </p>
  );
}
import { loadStripe } from '@stripe/stripe-js';
import { Elements, useStripe, useElements } from '@stripe/react-stripe-js';
import { ProSummaryCard } from '@/components/checkout/ProSummaryCard';
import { ServiceDetailsCard } from '@/components/checkout/ServiceDetailsCard';
import { PriceBreakdownCard } from '@/components/checkout/PriceBreakdownCard';
import { PaymentCard } from '@/components/checkout/PaymentCard';
import { StickyPayBar } from '@/components/checkout/StickyPayBar';
import { BookingRulesAccordion } from '@/components/booking/BookingRulesAccordion';
import { QuickRulesSheet } from '@/components/booking/QuickRulesSheet';

const stripePromise = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
  ? loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY)
  : null;

type QuoteData = {
  bookingId: string;
  quote: {
    amountSubtotal: number;
    amountPlatformFee: number;
    amountTravelFee: number;
    amountTotal: number;
    amountDeposit?: number;
    amountRemaining?: number;
    depositPercent?: number;
    currency: string;
  };
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
  clientSecret,
  onSuccess,
  isFinalPayment,
}: {
  bookingId: string;
  quoteData: QuoteData;
  clientSecret: string;
  onSuccess: () => void;
  isFinalPayment: boolean;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [quickRulesOpen, setQuickRulesOpen] = useState(false);

  const doSubmit = async () => {
    if (!stripe || !elements) return;

    setLoading(true);
    setError(null);

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
      setError(confirmError.message ?? 'Payment failed');
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

  return (
    <>
      <form
        id="checkout-form"
        onSubmit={(e) => {
          e.preventDefault();
          handleSubmit();
        }}
        className="hidden"
        aria-label="Payment form"
      />
      <PaymentCard />
      {error && (
        <div className="mt-4 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-sm text-red-700">
          {error}
        </div>
      )}
      <StickyPayBar
        amountTotal={quoteData.quote.amountDeposit ?? quoteData.quote.amountRemaining ?? quoteData.quote.amountTotal}
        currency={quoteData.quote.currency}
        disabled={!stripe || !elements}
        loading={loading}
        onSubmit={handleSubmit}
        label={isFinalPayment ? 'Pay remaining' : (quoteData.quote.amountDeposit ?? 0) > 0 ? 'Pay Deposit' : 'Confirm & Pay'}
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
  const [errorStatus, setErrorStatus] = useState<number | null>(null);

  useEffect(() => {
    let mounted = true;
    const run = async () => {
      setLoading(true);
      setError(null);
      setErrorStatus(null);
      try {
        let data: QuoteData;

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
          data = {
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
        } else {
          const quoteRes = await fetch(`/api/bookings/${bookingId}/quote`, { cache: 'no-store' });
          const quoteJson = await quoteRes.json();
          if (!mounted) return;
          if (!quoteRes.ok) {
            setError(quoteJson.error ?? 'Could not load quote');
            setErrorStatus(quoteRes.status);
            setLoading(false);
            return;
          }
          data = quoteJson.quote as QuoteData;
        }

        setQuoteData(data);

        const status = (data as { status?: string }).status ?? '';
        const isDepositFlow = !isFinalPayment && ['payment_required', 'accepted'].includes(status);
        const payUrl = isFinalPayment
          ? `/api/bookings/${bookingId}/pay/final`
          : isDepositFlow
            ? `/api/bookings/${bookingId}/pay/deposit`
            : `/api/bookings/${bookingId}/pay`;

        const payRes = await fetch(payUrl, {
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
        if (payJson.quote) {
          setQuoteData((prev) => prev ? { ...prev, ...payJson.quote } : prev);
        }
        if (isFinalPayment && payJson.amountRemaining != null) {
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
      } catch {
        if (mounted) setError('Could not load checkout');
      } finally {
        if (mounted) setLoading(false);
      }
    };
    void run();
    return () => { mounted = false; };
  }, [bookingId]);

  const pageBg = '#F5F5F5';

  return (
    <AppLayout mode="customer">
      <div className="min-h-screen" style={{ backgroundColor: pageBg }}>
        <div className="max-w-lg mx-auto px-4 py-8 pb-32">
          <Link
            href={`/customer/bookings/${bookingId}`}
            className="text-sm text-[#6A6A6A] hover:text-[#111111] mb-6 inline-block"
          >
            ← Back to booking
          </Link>

          <h1 className="text-2xl font-semibold text-[#111111] mb-6">Checkout</h1>

          {loading ? (
            <div className="space-y-4">
              <div className="rounded-2xl border border-black/5 bg-white p-6 shadow-sm animate-pulse h-24" />
              <div className="rounded-2xl border border-black/5 bg-white p-6 shadow-sm animate-pulse h-32" />
              <div className="rounded-2xl border border-black/5 bg-white p-6 shadow-sm animate-pulse h-40" />
            </div>
          ) : error ? (
            <div
              className="rounded-2xl border border-black/10 p-6"
              style={{ backgroundColor: '#F5F5F5' }}
            >
              <p className="text-sm text-[#3A3A3A] mb-4">{error}</p>
              {errorStatus === 409 && (
                <p className="text-xs text-[#6A6A6A] mb-4">
                  The booking may not be ready for payment yet, or the pro has not completed payout setup.
                </p>
              )}
              {errorStatus === 404 && (
                <p className="text-xs text-[#6A6A6A] mb-4">
                  This booking may not exist or you may not have access to it.
                </p>
              )}
              <Link
                href={`/customer/bookings/${bookingId}`}
                className="text-sm font-medium text-[#111111] hover:underline"
              >
                Return to booking
              </Link>
            </div>
          ) : quoteData && clientSecret && stripePromise ? (
            <div className="space-y-4">
              <ProSummaryCard
                proName={quoteData.proName}
                proPhotoUrl={quoteData.proPhotoUrl ?? null}
                serviceName={quoteData.serviceName}
              />
              <ServiceDetailsCard
                serviceName={quoteData.serviceName}
                serviceDate={quoteData.serviceDate}
                serviceTime={quoteData.serviceTime}
                address={quoteData.address}
                durationHours={quoteData.durationHours}
              />
              <PriceBreakdownCard quote={quoteData.quote} showDeposit={!!quoteData.quote.amountDeposit} />

              {quoteData.paymentDueAt && (
                <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
                  <CountdownTimer paymentDueAt={quoteData.paymentDueAt} />
                </div>
              )}

              <div
                className="rounded-2xl border border-black/5 bg-white p-5 shadow-sm"
                style={{ backgroundColor: '#FFFFFF' }}
              >
                <h3 className="text-sm font-medium text-[#6A6A6A] mb-3">Trust & protection</h3>
                <ul className="space-y-2 text-sm text-[#3A3A3A]">
                  <li>• Secure payment via Stripe</li>
                  <li>• Payment held until job completion</li>
                  <li>• Dispute resolution available</li>
                </ul>
                <Link
                  href="/booking-rules"
                  className="mt-3 inline-block text-xs text-[#6A6A6A] hover:text-[#111111] hover:underline"
                >
                  Booking Rules
                </Link>
              </div>

              <BookingRulesAccordion />

              <Elements
                stripe={stripePromise}
                options={{
                  clientSecret,
                  appearance: {
                    theme: 'stripe',
                    variables: { borderRadius: '12px' },
                  },
                }}
              >
                <CheckoutForm
                  bookingId={bookingId}
                  quoteData={quoteData}
                  clientSecret={clientSecret}
                  onSuccess={() => {
                    window.location.href = `/bookings/${bookingId}/confirmed`;
                  }}
                  isFinalPayment={isFinalPayment}
                />
              </Elements>
            </div>
          ) : (
            <p className="text-sm text-[#6A6A6A]">Stripe is not configured.</p>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
