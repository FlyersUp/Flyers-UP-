'use client';

/**
 * Navbar component - premium civic header.
 * Matches Flyers Up design system: #F5F5F5, #B2FBA5, #1A1A1A
 */

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { HeaderBrand } from './HeaderBrand';

interface NavbarProps {
  title?: string;
  showBackButton?: boolean;
  /** Hide Home and Sign In links (e.g. on booking flow when user is already authenticated) */
  hideRightLinks?: boolean;
}

export default function Navbar({ title = 'Flyers Up', showBackButton = false, hideRightLinks = false }: NavbarProps) {
  const router = useRouter();

  return (
    <nav
      className="sticky top-0 z-50 flex items-center min-h-16 md:min-h-[72px] border-b safe-area-top"
      style={{
        backgroundColor: '#F5F5F5',
        borderColor: '#F5F5F5',
        boxShadow: '0 1px 0 rgba(0,0,0,0.04)',
      }}
    >
      <div className="max-w-[1200px] w-full min-w-0 mx-auto flex items-center justify-between gap-3 px-4 sm:px-6 py-2 md:py-0">
        <div className="flex items-center gap-2 sm:gap-4 min-w-0 flex-1">
          {showBackButton && (
            <button
              onClick={() => router.back()}
              className="text-[#1A1A1A]/70 hover:text-[#1A1A1A] text-sm font-medium transition-opacity duration-150"
              aria-label="Go back"
            >
              ← Back
            </button>
          )}

          {title === 'Flyers Up' ? (
            <HeaderBrand />
          ) : (
            <div className="flex min-w-0 items-center gap-2 sm:gap-3">
              <span className="shrink-0">
                <HeaderBrand />
              </span>
              <span className="w-px h-6 bg-[#F5F5F5]" style={{ margin: '0 12px' }} aria-hidden />
              <span className="font-semibold text-[#1A1A1A] text-sm sm:text-base truncate min-w-0">
                {title}
              </span>
            </div>
          )}
        </div>

        {!hideRightLinks && (
          <div className="flex items-center gap-2 sm:gap-4 shrink-0">
            <Link
              href="/"
              className="text-sm text-[#1A1A1A]/70 hover:text-[#1A1A1A] font-medium transition-opacity duration-150"
            >
              Home
            </Link>
            <Link
              href="/signin"
              className="text-sm font-medium px-4 py-2 rounded-lg transition-all duration-150 bg-[#B2FBA5] hover:opacity-90 text-[#1A1A1A]"
            >
              Sign In
            </Link>
          </div>
        )}
      </div>
    </nav>
  );
}






