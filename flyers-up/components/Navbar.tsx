'use client';

/**
 * Navbar component - premium civic header.
 * Matches Flyers Up design system: #F2F2F0, #D9D5D2, #B2FBA5, #1A1A1A
 */

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { HeaderBrand } from './HeaderBrand';

interface NavbarProps {
  title?: string;
  showBackButton?: boolean;
}

export default function Navbar({ title = 'Flyers Up', showBackButton = false }: NavbarProps) {
  const router = useRouter();

  return (
    <nav
      className="sticky top-0 z-50 flex items-center h-16 md:h-[72px] border-b"
      style={{
        backgroundColor: '#F2F2F0',
        borderColor: '#D9D5D2',
        boxShadow: '0 1px 0 rgba(0,0,0,0.04)',
      }}
    >
      <div className="max-w-[1200px] w-full mx-auto flex items-center justify-between px-6">
        <div className="flex items-center gap-4">
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
            <div className="flex items-center gap-3">
              <HeaderBrand />
              <span className="w-px h-6 bg-[#D9D5D2]" style={{ margin: '0 12px' }} aria-hidden />
              <span className="font-semibold text-[#1A1A1A] text-base">{title}</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-4">
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
      </div>
    </nav>
  );
}






