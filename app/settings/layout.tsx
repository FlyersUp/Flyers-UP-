'use client';

/**
 * Settings Layout
 * Provides a 2-column layout with sidebar and content area
 */

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import SettingsSidebar from '@/components/SettingsSidebar';
import BottomNav from '@/components/BottomNav';
import { useCurrentUser } from '@/hooks/useCurrentUser';

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { user, loading } = useCurrentUser();

  useEffect(() => {
    if (loading) return;
    if (!user) router.push('/signin');
  }, [loading, router, user]);

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  const dashboardLink = user.role === 'pro' ? '/dashboard/pro' : '/dashboard/customer';

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <header className="bg-white/80 backdrop-blur-sm border-b border-emerald-100 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <button
            onClick={() => router.push(dashboardLink)}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors text-sm font-medium"
          >
            <span>← Back</span>
          </button>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex gap-8">
          <div className="hidden md:block">
            <SettingsSidebar userRole={user.role} />
          </div>

          <div className="flex-1">
            <div className="bg-white rounded-lg border border-gray-200 p-6">{children}</div>
          </div>
        </div>
      </div>

      <BottomNav />
    </div>
  );
}





