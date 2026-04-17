'use client';

import {
  ExpressCheckoutElement,
  PaymentElement,
} from '@stripe/react-stripe-js';
import type { ExpressCheckoutElementProps, PaymentElementProps } from '@stripe/react-stripe-js';
import { useCallback, type ReactNode } from 'react';

export type EmbeddedCheckoutVariant = 'checkout' | 'deposit' | 'authorize';

export type ExpressCheckoutClickEvent = Parameters<
  NonNullable<ExpressCheckoutElementProps['onClick']>
>[0];

type EmbeddedPaymentSectionProps = {
  variant: EmbeddedCheckoutVariant;
  /**
   * Runs confirmPayment with shared mutex + loading handled by the parent.
   * Used by Express Checkout onConfirm and by the card Pay button after gates.
   */
  onConfirmPayment: () => Promise<void>;
  /**
   * Gate wallet sheet (e.g. Quick Rules). Default: call resolve() immediately.
   */
  onExpressCheckoutClick?: (event: ExpressCheckoutClickEvent) => void;
  paymentElementOptions?: PaymentElementProps['options'];
};

function SectionShell({
  variant,
  children,
}: {
  variant: EmbeddedCheckoutVariant;
  children: ReactNode;
}) {
  if (variant === 'authorize') {
    return (
      <div className="w-full space-y-4" role="region" aria-labelledby="payment-method-heading">
        {children}
      </div>
    );
  }

  if (variant === 'checkout') {
    return (
      <div
        className="rounded-[20px] border border-[#E8EAED] bg-white p-5 shadow-[0_4px_24px_rgba(74,105,189,0.06)] dark:border-white/10 dark:bg-[#1a1d24] dark:shadow-[0_4px_24px_rgba(0,0,0,0.25)]"
        role="region"
        aria-labelledby="payment-method-heading"
      >
        {children}
      </div>
    );
  }

  // deposit
  return (
    <div
      className="rounded-2xl bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.06)] dark:bg-[#1a1d24] dark:shadow-[0_1px_3px_rgba(0,0,0,0.2)]"
      role="region"
      aria-labelledby="payment-method-heading"
    >
      {children}
    </div>
  );
}

function PaymentHeading({ variant }: { variant: EmbeddedCheckoutVariant }) {
  if (variant === 'checkout') {
    return (
      <h2 id="payment-method-heading" className="mb-4 text-sm font-semibold text-[#2d3436] dark:text-white">
        Payment method
      </h2>
    );
  }
  if (variant === 'deposit') {
    return (
      <h2 id="payment-method-heading" className="mb-4 text-sm font-medium text-[#222] dark:text-white">
        Payment method
      </h2>
    );
  }
  return (
    <h2 id="payment-method-heading" className="sr-only">
      Payment method
    </h2>
  );
}

/**
 * Express Checkout (wallets / Link) above Payment Element, same Elements instance and confirm path.
 */
export function EmbeddedPaymentSection({
  variant,
  onConfirmPayment,
  onExpressCheckoutClick,
  paymentElementOptions,
}: EmbeddedPaymentSectionProps) {
  const defaultExpressClick = useCallback((event: ExpressCheckoutClickEvent) => {
    event.resolve();
  }, []);

  const handleExpressClick = onExpressCheckoutClick ?? defaultExpressClick;

  const handleExpressConfirm = useCallback(() => {
    void onConfirmPayment();
  }, [onConfirmPayment]);

  return (
    <SectionShell variant={variant}>
      <PaymentHeading variant={variant} />

      <div className="rounded-xl border border-black/[0.06] bg-[#fafafa] p-3 dark:border-white/10 dark:bg-white/[0.04]">
        <ExpressCheckoutElement
          onClick={handleExpressClick}
          onConfirm={handleExpressConfirm}
          options={{
            buttonHeight: 48,
          }}
        />
      </div>

      <div
        className="relative my-5 flex items-center gap-3"
        role="separator"
        aria-label="Or pay another way"
      >
        <div className="h-px flex-1 bg-[#E8EAED] dark:bg-white/10" />
        <span className="shrink-0 text-[11px] font-medium uppercase tracking-wide text-[#8e8e93] dark:text-white/45">
          Or pay another way
        </span>
        <div className="h-px flex-1 bg-[#E8EAED] dark:bg-white/10" />
      </div>

      <PaymentElement options={paymentElementOptions ?? { layout: 'tabs' }} />
    </SectionShell>
  );
}
