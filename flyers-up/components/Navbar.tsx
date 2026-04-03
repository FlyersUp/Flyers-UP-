'use client';

/**
 * Public / marketing navbar — Flyers Up trust bar (slate) + pastel orange CTA.
 */

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { HeaderBrand } from './HeaderBrand';

interface NavbarProps {
  title?: string;
  showBackButton?: boolean;
  hideRightLinks?: boolean;
}

export default function Navbar({
  title = 'Flyers Up',
  showBackButton = false,
  hideRightLinks = false,
}: NavbarProps) {
  const router = useRouter();

  return (
    <nav className="safe-area-top sticky top-0 z-50 flex min-h-16 items-center border-b border-trust/20 bg-trust shadow-sm md:min-h-[72px]">
      <div className="mx-auto flex w-full min-w-0 max-w-[1200px] items-center justify-between gap-3 px-4 py-2 sm:px-6 md:py-0">
        <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-4">
          {showBackButton && (
            <button
              type="button"
              onClick={() => router.back()}
              className="text-sm font-medium text-white/85 transition-opacity hover:text-white"
              aria-label="Go back"
            >
              ← Back
            </button>
          )}

          {title === 'Flyers Up' ? (
            <HeaderBrand onTrustBackground />
          ) : (
            <div className="flex min-w-0 items-center gap-2 sm:gap-3">
              <span className="shrink-0">
                <HeaderBrand onTrustBackground />
              </span>
              <span className="mx-3 hidden h-6 w-px bg-white/25 sm:block" aria-hidden />
              <span className="min-w-0 truncate text-sm font-semibold text-white sm:text-base">
                {title}
              </span>
            </div>
          )}
        </div>

        {!hideRightLinks && (
          <div className="flex shrink-0 items-center gap-2 sm:gap-4">
            <Link
              href="/"
              className="text-sm font-medium text-white/85 transition-colors hover:text-white"
            >
              Home
            </Link>
            <Link
              href="/signin"
              className="rounded-xl bg-action px-4 py-2 text-sm font-semibold text-actionFg shadow-sm transition-colors hover:bg-[hsl(var(--action-hover))] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-action/50 focus-visible:ring-offset-2 focus-visible:ring-offset-trust"
            >
              Sign In
            </Link>
          </div>
        )}
      </div>
    </nav>
  );
}
