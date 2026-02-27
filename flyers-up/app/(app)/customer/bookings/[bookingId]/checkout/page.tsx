'use client';

import { AppLayout } from '@/components/layouts/AppLayout';
import Link from 'next/link';
import { use, useEffect, useState } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';

const stripePromise = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
  ? loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY)
  : null;

function formatDateTime(serviceDate?: string, serviceTime?: string): string {
  if (!serviceDate) return '—';
  try {
    const d = new Date(serviceDate);
    if (Number.isNaN(d.getTime())) return serviceDate;
    const dateStr = d.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
    return serviceTime ? `${dateStr} at ${serviceTime}` : dateStr;
  } catch {
    return serviceDate;
  }
}

type BookingSummary = {
  id: string;
  serviceName: string;
  proName: string;
  serviceDate: string;
  serviceTime: string;
  price: number;
};

function CheckoutForm({
  bookingId,
  summary,
  onSuccess,
}: {
  bookingId: string;
  summary: BookingSummary;
  onSuccess: () => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    setLoading(true);
    setError(null);

    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://www.flyersup.app';
    const returnUrl = `${origin}/customer/bookings/${bookingId}`;

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
    <form onSubmit={handleSubmit} className="space-y-6">
      <PaymentElement options={{ layout: 'tabs' }} />
      {error && (
        <div className="p-3 rounded-lg bg-danger/10 border border-danger/30 text-sm text-danger">
          {error}
        </div>
      )}
      <button
        type="submit"
        disabled={!stripe || loading}
        className="w-full h-11 rounded-full text-sm font-semibold text-black bg-[#FFC067] hover:brightness-95 disabled:opacity-60 transition-all"
      >
        {loading ? 'Processing…' : `Pay $${summary.price.toFixed(2)}`}
      </button>
    </form>
  );
}

export default function CheckoutPage({
  params,
}: {
  params: Promise<{ bookingId: string }>;
}) {
  const { bookingId } = use(params);
  const [loading, setLoading] = useState(true);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [summary, setSummary] = useState<BookingSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    const run = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/bookings/${bookingId}/pay`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        });
        const json = await res.json();

        if (!mounted) return;

        if (!res.ok) {
          setError(json.error ?? 'Could not start payment');
          setLoading(false);
          return;
        }

        setClientSecret(json.clientSecret ?? null);
        if (json.bookingSummary) {
          setSummary(json.bookingSummary);
        } else {
          const detailsRes = await fetch(`/api/customer/bookings/${bookingId}`, { cache: 'no-store' });
          const detailsJson = await detailsRes.json();
          const b = detailsJson?.booking;
          if (b) {
            setSummary({
              id: b.id,
              serviceName: b.serviceName ?? 'Service',
              proName: b.proName ?? 'Pro',
              serviceDate: b.serviceDate ?? '',
              serviceTime: b.serviceTime ?? '',
              price: Number(b.price ?? 0),
            });
          } else {
            setSummary({
              id: bookingId,
              serviceName: 'Service',
              proName: 'Pro',
              serviceDate: '',
              serviceTime: '',
              price: 0,
            });
          }
        }
      } catch {
        if (mounted) setError('Could not load checkout');
      } finally {
        if (mounted) setLoading(false);
      }
    };
    void run();
  }, [bookingId]);

  return (
    <AppLayout mode="customer">
      <div className="max-w-lg mx-auto px-4 py-8">
        <Link
          href={`/customer/bookings/${bookingId}`}
          className="text-sm text-muted hover:text-text mb-6 inline-block"
        >
          ← Back to booking
        </Link>

        <h1 className="text-2xl font-semibold text-text mb-6">Checkout</h1>

        {loading ? (
          <p className="text-sm text-muted">Loading…</p>
        ) : error ? (
          <div
            className="rounded-2xl border border-black/10 p-6"
            style={{ backgroundColor: '#F2F2F0' }}
          >
            <p className="text-sm text-muted mb-4">{error}</p>
            <Link
              href={`/customer/bookings/${bookingId}`}
              className="text-sm font-medium text-text hover:underline"
            >
              Back to booking
            </Link>
          </div>
        ) : clientSecret && summary && stripePromise ? (
          <div
            className="rounded-2xl border border-black/10 p-6 space-y-6"
            style={{ backgroundColor: '#F2F2F0' }}
          >
            <div>
              <p className="text-sm text-muted">
                {summary.serviceName} · {summary.proName}
              </p>
              <p className="text-sm text-muted mt-0.5">
                {formatDateTime(summary.serviceDate, summary.serviceTime)}
              </p>
              <p className="text-lg font-semibold text-text mt-2">${summary.price.toFixed(2)}</p>
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
                summary={summary}
                onSuccess={() => {
                  window.location.href = `/customer/bookings/${bookingId}`;
                }}
              />
            </Elements>
          </div>
        ) : (
          <p className="text-sm text-muted">Stripe is not configured.</p>
        )}
      </div>
    </AppLayout>
  );
}
