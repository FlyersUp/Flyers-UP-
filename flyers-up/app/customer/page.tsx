'use client';

import { useEffect, useState } from 'react';
import { AppLayout } from '@/components/layouts/AppLayout';
import { Label } from '@/components/ui/Label';
import { ServiceProCard } from '@/components/ui/ServiceProCard';
import { QuickRequestCard } from '@/components/ui/QuickRequestCard';
import { UpcomingCard, type UpcomingBooking } from '@/components/ui/UpcomingCard';
import { TrustCoverageCard } from '@/components/ui/TrustCoverageCard';
import { mockServicePros, mockCategories } from '@/lib/mockData';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { getOrCreateProfile, routeAfterAuth } from '@/lib/onboarding';
import { SideMenu } from '@/components/ui/SideMenu';

/**
 * Customer Home - Screen 1
 * Header with greeting, categories, featured pros
 */
export default function CustomerHome() {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [userName, setUserName] = useState('Account');

  useEffect(() => {
    const guard = async () => {
      const { data: { user }, error: userErr } = await supabase.auth.getUser();
      if (userErr) {
        router.replace(
          `/auth?next=%2Fcustomer&error=${encodeURIComponent('Could not read your session. Please try again.')}`
        );
        return;
      }
      if (!user) {
        router.replace(
          `/auth?next=%2Fcustomer&error=${encodeURIComponent(
            'You are not signed in (no session found). If you just signed in, try turning off private browsing and allow site storage.'
          )}`
        );
        return;
      }
      const profile = await getOrCreateProfile(user.id, user.email ?? null);
      if (!profile) return;
      const fallbackName = (user.email ? user.email.split('@')[0] : 'Account') || 'Account';
      setUserName(profile.first_name?.trim() || fallbackName);
      const dest = routeAfterAuth(profile, '/customer');
      if (dest !== '/customer') router.replace(dest);
    };
    void guard();
  }, [router]);

  // TODO: wire to real bookings/orders when available.
  const upcoming: UpcomingBooking | null = null;

  return (
    <AppLayout mode="customer">
      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <button
                type="button"
                onClick={() => setMenuOpen(true)}
                className="h-10 w-10 rounded-xl bg-surface2 border border-hairline text-text hover:bg-surface transition-colors"
                aria-label="Open menu"
              >
                ☰
              </button>
              <div>
                <h1 className="text-2xl font-semibold tracking-tight text-text">
                  {userName}
                </h1>
                <div className="text-sm text-muted">Customer</div>
                <div className="mt-1 text-sm text-muted">123 Main St, Your City</div>
              </div>
            </div>
          </div>
        </div>

        {/* New modules (do not change existing structure below) */}
        <div className="mb-8 space-y-4">
          <QuickRequestCard
            locationText="123 Main St, Your City"
            requestHref="/services"
          />
          <UpcomingCard booking={upcoming} browseHref="/services" />
          <TrustCoverageCard
            flags={{
              verifiedPros: true,
              securePayments: true,
              supportHref: '/settings/help-support',
            }}
          />
        </div>

        {/* Services Section */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <Label>SERVICES NEAR YOU</Label>
            <Link href="/customer/categories">
              <span className="text-sm font-medium text-text hover:underline">See all</span>
            </Link>
          </div>
          
          {/* Category chips */}
          <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-2">
            {mockCategories.slice(0, 6).map((cat) => (
              <Link
                key={cat.id}
                href={`/customer/categories/${cat.id}`}
                className="flex-shrink-0 surface-card px-4 py-3"
              >
                <div className="text-2xl mb-1">{cat.icon}</div>
                <div className="text-sm font-medium text-text">{cat.name}</div>
              </Link>
            ))}
          </div>
        </div>

        {/* Featured Pros */}
        <div className="mb-8">
          <Label className="mb-4 block">FEATURED PROS</Label>
          <div className="space-y-4">
            {mockServicePros.map((pro) => (
              <Link key={pro.id} href={`/customer/pros/${pro.id}`}>
                <ServiceProCard
                  name={pro.name}
                  rating={pro.rating}
                  reviewCount={pro.reviewCount}
                  startingPrice={pro.startingPrice}
                  badges={pro.badges}
                  accentLeft
                />
              </Link>
            ))}
          </div>
        </div>
      </div>
      <SideMenu open={menuOpen} onClose={() => setMenuOpen(false)} mode="customer" userName={userName} />
    </AppLayout>
  );
}

