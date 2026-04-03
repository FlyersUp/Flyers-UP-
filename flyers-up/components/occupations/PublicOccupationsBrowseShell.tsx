'use client';

import Link from 'next/link';
import { HeaderBrand } from '@/components/HeaderBrand';

/**
 * Public header + minimal shell for signed-out /occupations browse (no AppLayout / bottom nav).
 */
export function PublicOccupationsBrowseShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="public-light min-h-dvh min-h-[100svh] w-full max-w-full overflow-x-clip bg-bg text-text">
      <header className="sticky top-0 z-50 flex h-16 items-center justify-between border-b border-border bg-bg/95 px-4 backdrop-blur-sm md:px-6">
        <div className="mx-auto flex w-full max-w-[1200px] items-center justify-between px-2 sm:px-6">
          <HeaderBrand />
          <div className="flex shrink-0 items-center gap-2 sm:gap-3">
            <Link
              href="/signin?next=/occupations"
              className="px-3 py-2 text-sm font-medium text-text transition-colors hover:text-[hsl(var(--accent-customer))] sm:px-4"
            >
              Sign In
            </Link>
            <Link
              href="/signup?role=customer&next=/occupations"
              className="btn-press rounded-lg border border-[hsl(var(--accent-customer)/0.7)] bg-[hsl(var(--accent-customer))] px-3 py-2 text-sm font-medium text-[hsl(var(--accent-contrast))] shadow-[var(--shadow-1)] transition-all hover:brightness-95 sm:px-4"
            >
              Book a Pro
            </Link>
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-full pb-12 pt-1">{children}</main>
    </div>
  );
}
