'use client';

import { useEffect, useState } from 'react';
import { AppLayout } from '@/components/layouts/AppLayout';
import { Label } from '@/components/ui/Label';
import { Card } from '@/components/ui/Card';
import { UpcomingCard, type UpcomingBooking } from '@/components/ui/UpcomingCard';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { getOrCreateProfile, routeAfterAuth } from '@/lib/onboarding';
import { SideMenu } from '@/components/ui/SideMenu';
import { AppIcon } from '@/components/ui/AppIcon';

/**
 * Customer Home - Screen 1
 * Header with greeting, categories, featured pros
 */
export default function CustomerHome() {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [userName, setUserName] = useState('Account');
  const [upcoming, setUpcoming] = useState<UpcomingBooking | null>(null);
  const [ready, setReady] = useState(false);

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
      const first = profile.first_name?.trim();
      const last = profile.last_name?.trim();
      setUserName([first, last].filter(Boolean).join(' ') || fallbackName);
      const dest = routeAfterAuth(profile, '/customer');
      if (dest !== '/customer') {
        router.replace(dest);
        return;
      }
      setReady(true);
    };
    void guard();
  }, [router]);

  useEffect(() => {
    let mounted = true;
    const loadUpcoming = async () => {
      if (!ready) return;
      try {
        const todayISO = new Date().toISOString().slice(0, 10);
        const res = await fetch(
          `/api/customer/bookings?from=${encodeURIComponent(todayISO)}&limit=20&statuses=${encodeURIComponent(
            ['requested', 'accepted', 'awaiting_payment'].join(',')
          )}`,
          { cache: 'no-store' }
        );
        const json = (await res.json()) as {
          ok: boolean;
          bookings?: Array<{
            id: string;
            service_date: string;
            service_time: string;
            status: string;
            pro?: { displayName: string | null } | null;
          }>;
        };

        if (!mounted) return;
        if (!res.ok || !json.ok || !json.bookings?.length) {
          setUpcoming(null);
          return;
        }

        const b = json.bookings[0];
        const when = `${b.service_date} at ${b.service_time}`;
        // UI-friendly "safe" labeling: customers see "Scheduled" once accepted.
        const uiStatus = (() => {
          const s = (b.status || '').toLowerCase();
          if (s === 'accepted') return 'scheduled';
          return b.status;
        })();
        setUpcoming({
          serviceName: 'Service request',
          dateTimeLabel: when,
          proName: b.pro?.displayName || 'Service Pro',
          status: uiStatus,
          detailsHref: `/customer/chat/${b.id}`,
        });
      } catch {
        if (!mounted) return;
        setUpcoming(null);
      }
    };
    void loadUpcoming();
    return () => {
      mounted = false;
    };
  }, [ready]);

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
              </div>
            </div>
          </div>
        </div>

        {/* Clean slate (no mock data) */}
        <div className="mb-8 space-y-4">
          <UpcomingCard booking={upcoming} browseHref="/customer/categories" />
          <Card>
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="inline-block text-sm font-semibold tracking-tight text-text pb-2 border-b-2 border-b-accent">
                  Start here
                </div>
                <div className="mt-1 text-sm text-muted">
                  Calm, step-by-step. Nothing is booked until you confirm.
                </div>
              </div>
              <div className="shrink-0">
                <Link
                  href="/customer/categories"
                  className="inline-flex items-center justify-center rounded-xl px-4 py-2 bg-accent text-accentContrast font-semibold hover:opacity-95 transition-opacity focus-ring btn-press"
                >
                  Request a service
                </Link>
              </div>
            </div>
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Link
                href="/customer/categories"
                className="rounded-xl border border-border bg-surface hover:bg-surface2 transition-colors px-4 py-3"
              >
                <div className="mb-2">
                  <AppIcon name="plus" size={20} className="text-accent" alt="" />
                </div>
                <div className="text-sm font-semibold text-text">Browse services</div>
                <div className="text-xs text-muted mt-1">See what’s available, then request help.</div>
              </Link>
              <Link
                href="/customer/settings/addresses"
                className="rounded-xl border border-border bg-surface hover:bg-surface2 transition-colors px-4 py-3"
              >
                <div className="mb-2">
                  <AppIcon name="map-pin" size={18} className="text-muted" alt="" />
                </div>
                <div className="text-sm font-semibold text-text">Add your address</div>
                <div className="text-xs text-muted mt-1">So requests and booking are faster.</div>
              </Link>
            </div>
          </Card>
        </div>

        {/* Keep the browsing entry point, but don’t render mock lists here. */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-3">
            <Label>SERVICES</Label>
            <Link href="/customer/categories">
              <span className="text-sm font-medium text-text hover:underline">Browse</span>
            </Link>
          </div>
          <div className="text-sm text-muted">
            Browse services to find a pro and request help.
          </div>
        </div>
      </div>
      <SideMenu open={menuOpen} onClose={() => setMenuOpen(false)} mode="customer" userName={userName} />
    </AppLayout>
  );
}

