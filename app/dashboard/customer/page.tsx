'use client';

/**
 * Customer Dashboard
 * Requires an authenticated customer session.
 */

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Logo from '@/components/Logo';
import BottomNav from '@/components/BottomNav';
import { type Booking } from '@/lib/api';
import { useCustomerBookingsRealtime } from '@/hooks';
import { useCurrentUser } from '@/hooks/useCurrentUser';

export default function CustomerDashboard() {
  const router = useRouter();
  const { user, loading: authLoading, logout } = useCurrentUser();

  const { bookings, loading: bookingsLoading, error: bookingsError } = useCustomerBookingsRealtime(
    user?.id ?? null
  );

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.push('/signin?role=customer');
      return;
    }
    if (user.role !== 'customer') {
      router.push('/dashboard/pro');
    }
  }, [authLoading, router, user]);

  const handleLogout = async () => {
    await logout();
    router.push('/');
  };

  if (authLoading || !user) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-emerald-50 via-white to-emerald-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-500">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  const upcomingBookings = bookings.filter((b) => b.status === 'requested' || b.status === 'accepted');
  const pastBookings = bookings.filter(
    (b) => b.status === 'completed' || b.status === 'cancelled' || b.status === 'declined'
  );

  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-50 via-white to-emerald-50 pb-20">
      <header className="bg-white/80 backdrop-blur-sm border-b border-emerald-100 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Logo size="md" />
            <div className="flex items-center gap-4">
              <Link
                href="/browse"
                className="text-sm text-emerald-600 hover:text-emerald-700 font-medium transition-colors"
              >
                Browse Services
              </Link>
              <button
                onClick={handleLogout}
                className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </header>

      <section className="bg-emerald-600 text-white py-12">
        <div className="max-w-7xl mx-auto px-4">
          <h1 className="text-3xl font-bold mb-2">
            Welcome back{user.fullName ? `, ${user.fullName}` : user.email ? `, ${user.email.split('@')[0]}` : ''}!
            👋
          </h1>
          <p className="text-emerald-100">Manage your bookings and find new services</p>
        </div>
      </section>

      <main className="max-w-7xl mx-auto px-4 py-8 space-y-8">
        {bookingsError && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl">
            {bookingsError}
          </div>
        )}

        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900">Upcoming</h2>
          <Link
            href="/browse"
            className="inline-flex items-center gap-2 text-emerald-600 hover:text-emerald-700 font-medium"
          >
            Book a New Service →
          </Link>
        </div>

        {bookingsLoading ? (
          <div className="text-center py-12">
            <div className="w-10 h-10 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-500">Loading bookings...</p>
          </div>
        ) : upcomingBookings.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-lg shadow-emerald-50 border border-emerald-50 p-8 text-center">
            <div className="text-5xl mb-4">📋</div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No upcoming bookings</h3>
            <p className="text-gray-500 mb-4">Ready to book your next service?</p>
            <Link href="/browse" className="text-emerald-600 hover:text-emerald-700 font-medium">
              Browse available pros →
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {upcomingBookings.map((booking) => (
              <BookingCard key={booking.id} booking={booking} />
            ))}
          </div>
        )}

        {pastBookings.length > 0 && (
          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-4">Past</h2>
            <div className="space-y-4">
              {pastBookings.slice(0, 3).map((booking) => (
                <BookingCard key={booking.id} booking={booking} />
              ))}
            </div>
          </section>
        )}
      </main>

      <BottomNav />
    </div>
  );
}

function BookingCard({ booking }: { booking: Booking }) {
  const statusConfig: Record<string, { bg: string; text: string; label: string }> = {
    requested: { bg: 'bg-amber-100', text: 'text-amber-700', label: 'Pending' },
    accepted: { bg: 'bg-emerald-100', text: 'text-emerald-700', label: 'Confirmed' },
    completed: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Completed' },
    cancelled: { bg: 'bg-red-100', text: 'text-red-700', label: 'Cancelled' },
    declined: { bg: 'bg-gray-100', text: 'text-gray-700', label: 'Declined' },
  };

  const config = statusConfig[booking.status] || statusConfig.requested;

  return (
    <div className="bg-white rounded-2xl shadow-lg shadow-emerald-50 border border-emerald-50 p-6 hover:shadow-xl transition-shadow">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="font-bold text-gray-900 text-lg">{booking.proName}</h3>
          <p className="text-sm text-gray-500 capitalize">{booking.category} Service</p>
        </div>
        <span className={`px-3 py-1 rounded-full text-xs font-medium ${config.bg} ${config.text}`}>
          {config.label}
        </span>
      </div>

      <div className="space-y-2">
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <span>📅</span>
          <span>
            {new Date(booking.date).toLocaleDateString('en-US', {
              weekday: 'short',
              month: 'short',
              day: 'numeric',
            })}{' '}
            at {booking.time}
          </span>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <span>📍</span>
          <span className="truncate">{booking.address}</span>
        </div>
      </div>

      {booking.price && (
        <div className="pt-4 mt-4 border-t border-gray-100 flex items-center justify-between">
          <span className="text-sm text-gray-500">Total</span>
          <span className="text-xl font-bold text-emerald-600">${booking.price}</span>
        </div>
      )}
    </div>
  );
}






