'use client';

import { Info } from 'lucide-react';
import { cn } from '@/lib/cn';

export function PaymentHoldWhyCallout({
  headline,
  body,
  className,
}: {
  headline: string;
  body: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'rounded-2xl border border-amber-200/60 bg-gradient-to-br from-amber-50/95 to-amber-100/40 p-4 shadow-sm',
        className
      )}
    >
      <div className="flex gap-3">
        <span
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-200/50 text-amber-900"
          aria-hidden
        >
          <Info className="h-4 w-4" strokeWidth={2.5} />
        </span>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-amber-950">{headline}</p>
          <p className="mt-1 text-xs leading-relaxed text-amber-950/80">{body}</p>
        </div>
      </div>
    </div>
  );
}
