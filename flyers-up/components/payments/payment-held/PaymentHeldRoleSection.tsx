'use client';

import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

export function PaymentHeldRoleSection({
  roleLabel,
  badge,
  children,
  className,
}: {
  roleLabel: string;
  /** Optional amber pill shown beside the role label (e.g. Under review). */
  badge?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn('space-y-3', className)}>
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-text3">{roleLabel}</p>
        {badge ? (
          <span className="rounded-full bg-amber-100/90 px-2.5 py-0.5 text-[10px] font-semibold text-amber-900">
            {badge}
          </span>
        ) : null}
      </div>
      {children}
    </section>
  );
}
