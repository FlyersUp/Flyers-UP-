'use client';

/**
 * Customer Home Screen (simplified)
 * No localStorage auth. If not signed in, shows a lightweight marketing/CTA state.
 */

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import BottomNav from '@/components/BottomNav';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useCurrentUser } from '@/hooks/useCurrentUser';

export default function CustomerHomePage() {
  const router = useRouter();
  const { user, loading } = useCurrentUser();

  const name =
    user?.fullName?.trim() ||
    (user?.email ? user.email.split('@')[0] : '') ||
    '';

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <header className="sticky top-0 z-50 bg-white border-b border-gray-200 shadow-sm">
        <div className="px-4 py-3 flex items-center justify-between">
          <div>
            <div className="text-sm text-gray-500">Flyers Up</div>
            <div className="text-lg font-semibold text-gray-900">
              {user ? `Hi${name ? `, ${name}` : ''}` : 'Welcome'}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push('/notifications')}
              className="p-2 text-gray-600 hover:text-emerald-600 transition-colors"
              aria-label="Notifications"
            >
              <span className="text-xl">🔔</span>
            </button>
          </div>
        </div>
      </header>

      <main className="px-4 py-6 space-y-6">
        {!user && (
          <Card className="p-5">
            <div className="space-y-3">
              <h1 className="text-xl font-bold text-gray-900">Book a trusted pro</h1>
              <p className="text-sm text-gray-600">
                Sign in to request services, message pros, and manage bookings.
              </p>
              <div className="flex gap-3">
                <Link
                  href="/signin?role=customer"
                  className="flex-1 inline-flex items-center justify-center px-4 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-medium transition-colors"
                >
                  Sign In
                </Link>
                <Link
                  href="/signup?role=customer"
                  className="flex-1 inline-flex items-center justify-center px-4 py-3 bg-white border border-gray-200 hover:bg-gray-50 text-gray-900 rounded-xl font-medium transition-colors"
                >
                  Create Account
                </Link>
              </div>
            </div>
          </Card>
        )}

        <Card className="p-5">
          <div className="space-y-3">
            <h2 className="text-lg font-semibold text-gray-900">Browse services</h2>
            <p className="text-sm text-gray-600">Cleaning, plumbing, electrical, lawn care, and more.</p>
            <Button variant="primary" className="w-full" onClick={() => router.push('/browse')}>
              Browse Pros
            </Button>
          </div>
        </Card>
      </main>

      <BottomNav />
    </div>
  );
}



