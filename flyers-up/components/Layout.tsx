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
import BottomNav from './BottomNav';

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
      className="min-h-screen bg-bg text-text pb-20"
    >
      <Navbar title={title} showBackButton={showBackButton} hideRightLinks={hideNavLinks} />
      <main className="max-w-6xl mx-auto px-[var(--page-pad-x)] py-[var(--page-pad-y)]">
        {children}
      </main>
      <BottomNav />
    </div>
  );
}




