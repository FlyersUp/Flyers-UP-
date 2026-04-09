'use client';

import Link from 'next/link';
import { ReactNode } from 'react';
import { AppLayout } from '@/components/layouts/AppLayout';
import { ChevronLeft } from 'lucide-react';

type Props = {
  backHref: string;
  backLabel?: string;
  children: ReactNode;
};

/**
 * Customer payments subsection: full-width mobile-safe column above floating bottom nav.
 */
export function PaymentsSubpageShell({ backHref, backLabel = 'Payments', children }: Props) {
  return (
    <AppLayout mode="customer">
      <div className="mx-auto w-full min-w-0 max-w-2xl px-4 py-5 pb-12 sm:px-5 sm:py-6 sm:pb-10">
        <Link
          href={backHref}
          className="inline-flex min-w-0 items-center gap-1 text-sm font-medium text-[hsl(var(--accent-customer))] hover:opacity-90"
        >
          <ChevronLeft className="h-4 w-4 shrink-0" aria-hidden />
          <span className="truncate">{backLabel}</span>
        </Link>
        {children}
      </div>
    </AppLayout>
  );
}
