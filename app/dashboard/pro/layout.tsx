'use client';

/**
 * Pro Dashboard Layout
 * Shared layout for all pro dashboard pages
 */

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import Logo from '@/components/Logo';
import { useCurrentUser } from '@/hooks/useCurrentUser';

interface ProLayoutProps {
  children: React.ReactNode;
}

const navItems = [
  { name: 'Overview', href: '/dashboard/pro', icon: '📊' },
  { name: 'Requests', href: '/dashboard/pro/requests', icon: '📬' },
  { name: 'Active', href: '/dashboard/pro/active', icon: '🔥' },
  { name: 'Scheduled', href: '/dashboard/pro/scheduled', icon: '📅' },
  { name: 'Completed', href: '/dashboard/pro/completed', icon: '✅' },
];

export default function ProDashboardLayout({ children }: ProLayoutProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, loading, logout } = useCurrentUser();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.push('/signin?role=pro');
      return;
    }
    if (user.role !== 'pro') {
      router.push('/dashboard/customer');
    }
  }, [loading, router, user]);

  const handleLogout = async () => {
    await logout();
    router.push('/');
  };

  if (loading || !user) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-amber-50 via-white to-amber-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-amber-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-500">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 via-white to-amber-50">
      <header className="bg-white/80 backdrop-blur-sm border-b border-amber-100 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <Logo size="md" />
              <nav className="hidden md:flex items-center gap-1">
                {navItems.map((item) => {
                  const isActive = pathname === item.href;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5 ${
                        isActive
                          ? 'bg-amber-100 text-amber-700'
                          : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                      }`}
                    >
                      <span>{item.icon}</span>
                      <span>{item.name}</span>
                    </Link>
                  );
                })}
              </nav>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-amber-600 bg-amber-50 px-3 py-1 rounded-full font-medium hidden sm:inline-flex">
                🔧 Pro Account
              </span>
              <button
                onClick={handleLogout}
                className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
              >
                Sign Out
              </button>
            </div>
          </div>

          <nav className="md:hidden flex items-center gap-1 mt-3 overflow-x-auto pb-2">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5 whitespace-nowrap ${
                    isActive
                      ? 'bg-amber-100 text-amber-700'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                  }`}
                >
                  <span>{item.icon}</span>
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </nav>
        </div>
      </header>

      {children}

      <footer className="bg-gray-900 text-gray-400 py-8 mt-12">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <Logo size="sm" linkToHome={false} className="brightness-0 invert mx-auto mb-4" />
          <p className="text-sm">© 2024 Flyers Up. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}





