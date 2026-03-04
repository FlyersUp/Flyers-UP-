'use client';

import { AppLayout } from '@/components/layouts/AppLayout';
import Link from 'next/link';
import { use, useEffect, useState } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, useStripe, useElements } from '@stripe/react-stripe-js';
import { ProSummaryCard } from '@/components/checkout/ProSummaryCard';
import { ServiceDetailsCard } from '@/components/checkout/ServiceDetailsCard';
import { PriceBreakdownCard } from '@/components/checkout/PriceBreakdownCard';
import { PaymentCard } from '@/components/checkout/PaymentCard';
import { StickyPayBar } from '@/components/checkout/StickyPayBar';

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
    currency: string;
  };
  serviceName: string;
  proName: string;
  serviceDate: string;
  serviceTime: string;
  address?: string;
  durationHours?: number;
  proPhotoUrl?: string | null;
};

function CheckoutForm({
  bookingId,
  quoteData,
  clientSecret,
  onSuccess,
}: {
  bookingId: string;
  quoteData: QuoteData;
  clientSecret: string;
  onSuccess: () => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
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

  return (
    <>
      <form
        id="checkout-form"
        onSubmit={(e) => {
          e.preventDefault();
          handleSubmit();
        }}
        className="hidden"
      />
      <PaymentCard />
      {error && (
        <div className="mt-4 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-sm text-red-700">
          {error}
        </div>
      )}
      <StickyPayBar
        amountTotal={quoteData.quote.amountTotal}
        currency={quoteData.quote.currency}
        disabled={!stripe || !elements}
        loading={loading}
        onSubmit={handleSubmit}
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
        const quoteRes = await fetch(`/api/bookings/${bookingId}/quote`, { cache: 'no-store' });
        const quoteJson = await quoteRes.json();

        if (!mounted) return;

        if (!quoteRes.ok) {
          setError(quoteJson.error ?? 'Could not load quote');
          setErrorStatus(quoteRes.status);
          setLoading(false);
          return;
        }

        const data = quoteJson.quote as QuoteData;
        setQuoteData(data);

        const payRes = await fetch(`/api/bookings/${bookingId}/pay`, {
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
        if (payJson.quote && !data.proPhotoUrl) {
          setQuoteData((prev) => prev ? { ...prev, ...payJson.quote } : prev);
        }
      } catch {
        if (mounted) setError('Could not load checkout');
      } finally {
        if (mounted) setLoading(false);
      }
    };
    void run();
  }, [bookingId]);

  const pageBg = '#FAF8F6';

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
              style={{ backgroundColor: '#F2F2F0' }}
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
              <PriceBreakdownCard quote={quoteData.quote} />

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
              </div>

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
