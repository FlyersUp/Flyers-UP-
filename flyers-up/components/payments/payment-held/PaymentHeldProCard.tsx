'use client';

import Link from 'next/link';
import type { MoneyUiPresentation } from '@/lib/bookings/money-presentation';
import { cn } from '@/lib/cn';
import { PaymentHeldTimeline } from './PaymentHeldTimeline';
import { PaymentHoldWhyCallout } from './PaymentHoldWhyCallout';

export function PaymentHeldProCard({
  presentation,
  detailsHref,
  supportHref = '/support',
  className,
}: {
  presentation: MoneyUiPresentation;
  detailsHref: string;
  supportHref?: string;
  className?: string;
}) {
  const timeline = presentation.heldProTimeline ?? [];

  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-2xl border border-border/80 bg-surface p-5 shadow-card',
        className
      )}
    >
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="min-w-0 pr-2">
          <h2 className="text-lg font-bold leading-snug text-trust sm:text-xl">{presentation.title}</h2>
          <p className="mt-1 text-sm leading-relaxed text-text3">{presentation.subtitle}</p>
        </div>
        <span className="shrink-0 rounded-full bg-amber-100/90 px-3 py-1 text-xs font-semibold text-amber-900">
          {presentation.badge}
        </span>
      </div>

      {timeline.length > 0 ? <PaymentHeldTimeline items={timeline} className="mb-5" /> : null}

      <div className="mb-6 rounded-2xl border border-trust/15 bg-trust/[0.06] px-4 py-3">
        <p className="text-sm leading-relaxed text-text2">{presentation.body}</p>
      </div>

      {presentation.whyCallout ? (
        <div className="mb-6">
          <PaymentHoldWhyCallout
            headline={presentation.whyCallout.headline}
            body={presentation.whyCallout.body}
          />
        </div>
      ) : null}

      <div className="flex flex-col gap-3">
        {presentation.ctaPrimary ? (
          <Link
            href={detailsHref}
            className="flex h-12 w-full items-center justify-center rounded-full bg-trust text-sm font-semibold text-trustFg transition-opacity hover:opacity-95"
          >
            {presentation.ctaPrimary}
          </Link>
        ) : null}
        {presentation.ctaSecondary ? (
          <Link
            href={supportHref}
            className="flex h-12 w-full items-center justify-center rounded-full bg-trust/10 text-sm font-semibold text-trust transition-colors hover:bg-trust/[0.14]"
          >
            {presentation.ctaSecondary}
          </Link>
        ) : null}
      </div>
    </div>
  );
}
