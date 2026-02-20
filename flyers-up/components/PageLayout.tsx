'use client';

/**
 * Page Layout Component
 * Provides consistent page structure with:
 * - Back button
 * - Bottom navigation footer
 * - Proper padding to prevent content overlap
 * AccentDensity: default for most pages
 */

import { useRouter, usePathname } from 'next/navigation';
import BottomNav from './BottomNav';

interface PageLayoutProps {
  children: React.ReactNode;
  showBackButton?: boolean;
  backButtonText?: string;
  backButtonHref?: string;
  className?: string;
  mode?: 'customer' | 'pro';
  accentDensity?: 'default' | 'focus';
}

export default function PageLayout({
  children,
  showBackButton = true,
  backButtonText = '← Back',
  backButtonHref,
  className = '',
  mode,
  accentDensity = 'default',
}: PageLayoutProps) {
  const router = useRouter();
  const pathname = usePathname() ?? '';

  const resolvedMode = mode ?? (pathname.startsWith('/pro') ? 'pro' : 'customer');

  const handleBack = () => {
    if (backButtonHref) {
      router.push(backButtonHref);
    } else {
      router.back();
    }
  };

  return (
    <div
      data-role={resolvedMode}
      data-accent={accentDensity}
      className={`min-h-screen bg-bg text-text pb-20 ${className}`}
    >
      {/* Back Button Header */}
      {showBackButton && (
        <header className="bg-[var(--surface-solid)] border-b border-[var(--surface-border)] sticky top-0 z-40">
          <div className="max-w-7xl mx-auto px-[var(--page-pad-x)] py-3">
            <button
              onClick={handleBack}
              className="flex items-center gap-2 text-muted hover:text-text transition-colors text-sm font-medium"
            >
              <span>{backButtonText}</span>
            </button>
          </div>
        </header>
      )}

      {/* Page Content */}
      <main className="max-w-7xl mx-auto px-[var(--page-pad-x)] py-[var(--page-pad-y)]">
        {children}
      </main>

      {/* Bottom Navigation Footer */}
      <BottomNav />
    </div>
  );
}








