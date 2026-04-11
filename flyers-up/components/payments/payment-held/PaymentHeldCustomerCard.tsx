'use client';

import Link from 'next/link';
import { ShieldCheck } from 'lucide-react';
import type { MoneyUiPresentation } from '@/lib/bookings/money-presentation';
import { cn } from '@/lib/cn';
import { PaymentHoldWhyCallout } from './PaymentHoldWhyCallout';

export function PaymentHeldCustomerCard({
  presentation,
  bookingHref,
  supportHref = '/support',
  className,
}: {
  presentation: MoneyUiPresentation;
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
          <h2 className="text-lg font-bold leading-snug text-trust">{presentation.title}</h2>
          <p className="mt-0.5 text-sm text-text3">{presentation.subtitle}</p>
        </div>
      </div>

      <p className="text-sm leading-relaxed text-text2">{presentation.body}</p>

      {presentation.whyCallout ? (
        <div className="mt-5">
          <PaymentHoldWhyCallout
            headline={presentation.whyCallout.headline}
            body={presentation.whyCallout.body}
          />
        </div>
      ) : null}

      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:gap-3">
        {presentation.ctaPrimary ? (
          <Link
            href={bookingHref}
            className="flex h-12 flex-1 items-center justify-center rounded-full bg-trust/10 text-sm font-semibold text-trust transition-colors hover:bg-trust/[0.14]"
          >
            {presentation.ctaPrimary}
          </Link>
        ) : null}
        {presentation.ctaSecondary ? (
          <Link
            href={supportHref}
            className="flex h-12 flex-1 items-center justify-center rounded-full bg-trust/10 text-sm font-semibold text-trust transition-colors hover:bg-trust/[0.14]"
          >
            {presentation.ctaSecondary}
          </Link>
        ) : null}
      </div>
    </div>
  );
}
