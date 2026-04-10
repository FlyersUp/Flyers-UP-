'use client';

import { Check } from 'lucide-react';
import type { PaymentHeldTimelineItem } from '@/lib/bookings/payment-held-ui-state';
import { cn } from '@/lib/cn';

export function PaymentHeldTimeline({ items, className }: { items: PaymentHeldTimelineItem[]; className?: string }) {
  return (
    <ul className={cn('relative m-0 list-none p-0', className)} aria-label="Payout progress">
      {items.map((step, index) => {
        const isLast = index === items.length - 1;
        const lineActive = step.state === 'complete' || step.state === 'current';
        return (
          <li key={step.key} className="relative flex gap-3 pb-6 last:pb-0">
            {!isLast ? (
              <span
                className={cn(
                  'absolute left-[11px] top-7 bottom-0 w-px',
                  lineActive ? 'bg-trust/45' : 'bg-trust/15'
                )}
                aria-hidden
              />
            ) : null}
            <div className="relative z-[1] flex shrink-0 flex-col items-center">
              {step.state === 'complete' ? (
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-trust text-trustFg shadow-sm">
                  <Check className="h-3.5 w-3.5 stroke-[2.5]" aria-hidden />
                </span>
              ) : null}
              {step.state === 'current' ? (
                <span
                  className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-trust bg-surface shadow-[0_0_0_4px_hsl(var(--trust)/0.12)] ring-1 ring-trust/20"
                  aria-current="step"
                >
                  <span className="h-2 w-2 rounded-full bg-trust" />
                </span>
              ) : null}
              {step.state === 'upcoming' ? (
                <span
                  className="flex h-6 w-6 items-center justify-center rounded-full border border-trust/25 bg-trust/[0.08]"
                  aria-hidden
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-trust/30" />
                </span>
              ) : null}
            </div>
            <div className="min-w-0 flex-1 pt-0.5">
              <p
                className={cn(
                  'text-sm font-semibold leading-tight',
                  step.state === 'current' ? 'text-text' : step.state === 'complete' ? 'text-text2' : 'text-text3'
                )}
              >
                {step.label}
              </p>
              <p className="mt-0.5 text-xs leading-relaxed text-text3">{step.helper}</p>
              {step.timestamp ? (
                <p className="mt-1 text-[11px] text-muted">{step.timestamp}</p>
              ) : null}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
