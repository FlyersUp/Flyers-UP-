'use client';

/**
 * HeaderBrand — Flyers Up wordmark for app/marketing headers.
 */

import Logo from './Logo';

export function HeaderBrand({ onTrustBackground }: { onTrustBackground?: boolean }) {
  return (
    <div className="flex items-center">
      <Logo
        size="md"
        linkToHome={true}
        variant="header"
        onTrustBackground={onTrustBackground}
        className="shrink-0"
      />
    </div>
  );
}
