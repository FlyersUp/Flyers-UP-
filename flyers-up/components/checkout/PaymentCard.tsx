'use client';

import { PaymentElement } from '@stripe/react-stripe-js';

/**
 * PaymentCard wraps Stripe PaymentElement.
 */
export function PaymentCard() {
  return (
    <div
      className="rounded-2xl border border-black/5 bg-white p-5 shadow-sm"
      style={{ backgroundColor: '#FFFFFF' }}
    >
      <h3 className="text-sm font-medium text-[#6A6A6A] mb-4">Payment method</h3>
      <PaymentElement
        options={{
          layout: 'tabs',
        }}
      />
    </div>
  );
}
