/**
 * Layout wrapper component
 * Provides consistent page structure with Navbar
 * 
 * Usage:
 * <Layout title="Customer Dashboard">
 *   <YourContent />
 * </Layout>
 */

import Navbar from './Navbar';
import BottomNav from './BottomNav';

interface LayoutProps {
  children: React.ReactNode;
  title?: string;
  showBackButton?: boolean;
}

export default function Layout({ children, title, showBackButton = false }: LayoutProps) {
  return (
    <div className="min-h-screen bg-bg text-text pb-20">
      <Navbar title={title} showBackButton={showBackButton} />
      <main className="max-w-6xl mx-auto px-[var(--page-pad-x)] py-[var(--page-pad-y)]">
        {children}
      </main>
      <BottomNav />
    </div>
  );
}




