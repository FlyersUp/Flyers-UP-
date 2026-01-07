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

interface LayoutProps {
  children: React.ReactNode;
  title?: string;
  showBackButton?: boolean;
}

export default function Layout({ children, title, showBackButton = false }: LayoutProps) {
  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar title={title} showBackButton={showBackButton} />
      <main className="max-w-6xl mx-auto px-4 py-6">
        {children}
      </main>
    </div>
  );
}




