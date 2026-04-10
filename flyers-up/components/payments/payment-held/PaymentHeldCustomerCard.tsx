'use client';

import Link from 'next/link';
import { ShieldCheck } from 'lucide-react';
import type { PaymentHeldUiState } from '@/lib/bookings/payment-held-ui-state';
import { cn } from '@/lib/cn';

export function PaymentHeldCustomerCard({
  state,
  bookingHref,
  supportHref = '/support',
  className,
}: {
  state: PaymentHeldUiState;
  bookingHref: string;
  supportHref?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'rounded-2xl border border-border/80 bg-surface p-5 shadow-card',
        className
      )}
    >
      <div className="mb-4 flex gap-3">
        <span
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-amber-100/90 text-amber-900 shadow-sm"
          aria-hidden
        >
          <ShieldCheck className="h-5 w-5" strokeWidth={2} />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-lg font-bold leading-snug text-trust">{state.title}</h2>
          <p className="mt-0.5 text-sm text-text3">{state.subtitle}</p>
        </div>
      </div>

      <p className="text-sm leading-relaxed text-text2">{state.infoPanelBody}</p>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:gap-3">
        <Link
          href={bookingHref}
          className="flex h-12 flex-1 items-center justify-center rounded-full bg-trust/10 text-sm font-semibold text-trust transition-colors hover:bg-trust/[0.14]"
        >
          Back to booking
        </Link>
        <Link
          href={supportHref}
          className="flex h-12 flex-1 items-center justify-center rounded-full bg-trust/10 text-sm font-semibold text-trust transition-colors hover:bg-trust/[0.14]"
        >
          Contact support
        </Link>
      </div>
    </div>
  );
}
