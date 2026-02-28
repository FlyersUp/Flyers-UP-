'use client';

/**
 * HeaderBrand: Logo + optional divider + icon for premium header.
 * Matches Flyers Up design system: #F2F2F0, #D9D5D2, #B2FBA5, #1A1A1A
 */

import Link from 'next/link';
import Logo, { LogoIcon } from './Logo';

interface HeaderBrandProps {
  /** Show icon in circle on right of logo */
  showIcon?: boolean;
  /** Show vertical divider between logo and icon */
  showDivider?: boolean;
}

export function HeaderBrand({ showIcon = true, showDivider = true }: HeaderBrandProps) {
  return (
    <div className="flex items-center gap-4">
      <Logo size="md" linkToHome={true} variant="header" className="shrink-0" />
      {showDivider && (
        <div
          className="w-px h-6 bg-[#D9D5D2] shrink-0"
          style={{ margin: '0 16px' }}
          aria-hidden
        />
      )}
      {showIcon && (
        <Link
          href="/"
          className="flex items-center justify-center w-9 h-9 rounded-full bg-[#F2F2F0] border border-[#D9D5D2] shrink-0 transition-transform duration-150 ease-out hover:scale-105 focus:outline-none focus:ring-2 focus:ring-[#B2FBA5] focus:ring-offset-2 focus:ring-offset-[#F2F2F0]"
          style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}
          aria-label="Flyers Up home"
        >
          <LogoIcon className="w-5 h-7 text-[#B2FBA5]" />
        </Link>
      )}
    </div>
  );
}
