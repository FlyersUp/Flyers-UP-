'use client';

/**
 * HeaderBrand: Logo for premium header.
 * Matches Flyers Up design system: #F5F5F5, #B2FBA5, #1A1A1A
 */

import Logo from './Logo';

export function HeaderBrand() {
  return (
    <div className="flex items-center">
      <Logo size="md" linkToHome={true} variant="header" className="shrink-0" />
    </div>
  );
}
