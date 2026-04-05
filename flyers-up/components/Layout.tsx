/**
 * Layout wrapper component
 * Provides consistent page structure with Navbar
 * AccentDensity: default for shared/public routes (services, book, admin)
 *
 * Usage:
 * <Layout title="Customer Dashboard" mode="customer">
 *   <YourContent />
 * </Layout>
 */

import Navbar from './Navbar';
import FloatingBottomNav from '@/components/navigation/FloatingBottomNav';

interface LayoutProps {
  children: React.ReactNode;
  title?: string;
  showBackButton?: boolean;
  /** Hide Home and Sign In in top right (e.g. booking flow) */
  hideNavLinks?: boolean;
  mode?: 'customer' | 'pro';
  accentDensity?: 'default' | 'focus';
}

export default function Layout({
  children,
  title,
  showBackButton = false,
  hideNavLinks = false,
  mode = 'customer',
  accentDensity = 'default',
}: LayoutProps) {
  return (
    <div
      data-role={mode}
      data-accent={accentDensity}
      className="mx-auto flex min-h-dvh min-h-[100svh] min-w-0 w-full max-w-full flex-col overflow-x-clip bg-bg text-text pb-fu-nav"
    >
      <Navbar title={title} showBackButton={showBackButton} hideRightLinks={hideNavLinks} />
      <main className="mobile-page-root mx-auto w-full max-w-6xl min-w-0 px-3 py-[var(--page-pad-y)] sm:px-[var(--page-pad-x)]">
        {children}
      </main>
      <FloatingBottomNav />
    </div>
  );
}




