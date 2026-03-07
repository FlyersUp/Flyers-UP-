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
      className={`min-h-screen bg-[#F5F5F5] dark:bg-[#0F1115] text-gray-900 dark:text-[#F5F7FA] pb-32 ${className}`}
    >
      {/* Back Button Header */}
      {showBackButton && (
        <header className="bg-white dark:bg-[#171A20] border-b border-[#E5E5E5] dark:border-white/10 sticky top-0 z-40">
          <div className="max-w-7xl mx-auto px-[var(--page-pad-x)] py-3">
            <button
              onClick={handleBack}
              className="flex items-center gap-2 text-[#6B7280] dark:text-[#A1A8B3] hover:text-gray-900 dark:hover:text-[#F5F7FA] transition-colors text-sm font-medium"
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
      <FloatingBottomNav />
    </div>
  );
}








