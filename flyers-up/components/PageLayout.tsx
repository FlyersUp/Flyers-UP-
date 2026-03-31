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
import FloatingBottomNav from '@/components/navigation/FloatingBottomNav';

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
      className={`min-h-dvh min-h-[100svh] w-full max-w-full overflow-x-clip bg-bg text-text pb-[calc(8rem+env(safe-area-inset-bottom,0px))] ${className}`}
    >
      {/* Back Button Header */}
      {showBackButton && (
        <header className="safe-area-top bg-surface border-b border-border sticky top-0 z-40">
          <div className="mobile-page-root max-w-7xl mx-auto px-[var(--page-pad-x)] py-3 min-w-0">
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
      <main className="mobile-page-root max-w-7xl mx-auto px-[var(--page-pad-x)] py-[var(--page-pad-y)] min-w-0">
        {children}
      </main>

      {/* Bottom Navigation Footer */}
      <FloatingBottomNav />
    </div>
  );
}








