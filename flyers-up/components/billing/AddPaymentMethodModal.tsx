'use client';

import { useState } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';

const stripePromise = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
  ? loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY)
  : null;

function AddPaymentForm({
  onSuccess,
  onCancel,
}: {
  onSuccess: () => void;
  onCancel: () => void;
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

    const { error: submitError } = await stripe.confirmSetup({
      elements,
      confirmParams: {
        return_url: window.location.href,
      },
    });

    setLoading(false);

    if (submitError) {
      setError(submitError.message ?? 'Failed to save card');
      return;
    }

    onSuccess();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <PaymentElement options={{ layout: 'tabs' }} />
      {error && (
        <div className="p-3 rounded-lg bg-danger/10 border border-danger/30 text-sm text-danger">
          {error}
        </div>
      )}
      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          disabled={!stripe || loading}
          className="h-11 px-5 rounded-full text-sm font-semibold text-black bg-[#FFC067] hover:brightness-95 disabled:opacity-60 transition-all"
        >
          {loading ? 'Saving…' : 'Save card'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={loading}
          className="h-11 px-5 rounded-full text-sm font-medium border border-black/15 hover:bg-black/5 transition-colors"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

export interface AddPaymentMethodModalProps {
  clientSecret: string;
  onSuccess: () => void;
  onClose: () => void;
}

export function AddPaymentMethodModal({ clientSecret, onSuccess, onClose }: AddPaymentMethodModalProps) {
  if (!stripePromise) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
        <div className="rounded-2xl bg-[#F2F2F0] p-6 max-w-md w-full">
          <p className="text-sm text-muted">Stripe is not configured.</p>
          <button
            type="button"
            onClick={onClose}
            className="mt-4 h-11 px-5 rounded-full text-sm font-medium border border-black/15 hover:bg-black/5"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  const options = {
    clientSecret,
    appearance: {
      theme: 'stripe' as const,
      variables: {
        borderRadius: '12px',
      },
    },
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div
        className="rounded-2xl border border-black/10 p-6 max-w-md w-full max-h-[90vh] overflow-auto"
        style={{ backgroundColor: '#F2F2F0' }}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-text">Add payment method</h3>
          <button
            type="button"
            onClick={onClose}
            className="h-8 w-8 rounded-lg hover:bg-black/5 flex items-center justify-center text-muted"
            aria-label="Close"
          >
            ×
          </button>
        </div>
        <Elements stripe={stripePromise} options={options}>
          <AddPaymentForm
            onSuccess={onSuccess}
            onCancel={onClose}
          />
        </Elements>
      </div>
    </div>
  );
}
