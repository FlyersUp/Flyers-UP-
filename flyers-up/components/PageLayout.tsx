'use client';

/**
 * Page Layout Component
 * Provides consistent page structure with:
 * - Back button
 * - Bottom navigation footer
 * - Proper padding to prevent content overlap
 */

import { useRouter } from 'next/navigation';
import BottomNav from './BottomNav';

interface PageLayoutProps {
  children: React.ReactNode;
  showBackButton?: boolean;
  backButtonText?: string;
  backButtonHref?: string;
  className?: string;
}

export default function PageLayout({
  children,
  showBackButton = true,
  backButtonText = '← Back',
  backButtonHref,
  className = '',
}: PageLayoutProps) {
  const router = useRouter();

  const handleBack = () => {
    if (backButtonHref) {
      router.push(backButtonHref);
    } else {
      router.back();
    }
  };

  return (
    <div className={`min-h-screen bg-gradient-to-b from-emerald-50 via-white to-emerald-50 pb-20 ${className}`}>
      {/* Back Button Header */}
      {showBackButton && (
        <header className="bg-white/80 backdrop-blur-sm border-b border-emerald-100 sticky top-0 z-40">
          <div className="max-w-7xl mx-auto px-4 py-3">
            <button
              onClick={handleBack}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors text-sm font-medium"
            >
              <span>{backButtonText}</span>
            </button>
          </div>
        </header>
      )}

      {/* Page Content */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        {children}
      </main>

      {/* Bottom Navigation Footer */}
      <BottomNav />
    </div>
  );
}





