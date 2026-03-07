'use client';

import { useEffect, useState } from 'react';
import { AppLayout } from '@/components/layouts/AppLayout';
import { DashboardCard, DashboardSectionSkeleton } from '@/components/dashboard/DashboardCard';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { getOrCreateProfile, routeAfterAuth } from '@/lib/onboarding';
import { getProsForFlyerWall } from '@/lib/api';
import { SideMenu } from '@/components/ui/SideMenu';

type ActiveBooking = {
  id: string;
  serviceName: string;
  proName: string;
  dateTime: string;
  status: string;
};

type NearbyPro = {
  id: string;
  name: string;
  categoryName: string;
  rating: number;
  startingPrice: number;
  profilePhotoUrl?: string | null;
};

type LiveRequest = {
  id: string;
  title: string;
  budget_min: number | null;
  budget_max: number | null;
  preferred_date: string | null;
  preferred_time: string | null;
};

type FavoritePro = {
  proId: string;
  pro: { id: string; displayName: string; logoUrl?: string | null; serviceName: string } | null;
};

function getInitials(name: string): string {
  return name.trim().split(/\s+/).map((s) => s[0]).slice(0, 2).join('').toUpperCase() || '?';
}

function formatStatus(s: string): string {
  const lower = (s || '').toLowerCase();
  if (lower === 'accepted') return 'Scheduled';
  if (lower === 'on_the_way') return 'On the way';
  if (lower === 'in_progress') return 'In progress';
  if (lower === 'awaiting_payment') return 'Completed';
  return s.replace(/_/g, ' ');
}

export default function CustomerDashboard() {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [userName, setUserName] = useState('Account');
  const [ready, setReady] = useState(false);

  const [activeBooking, setActiveBooking] = useState<ActiveBooking | null>(null);
  const [activeBookingLoading, setActiveBookingLoading] = useState(true);

  const [nearbyPros, setNearbyPros] = useState<NearbyPro[]>([]);
  const [nearbyProsLoading, setNearbyProsLoading] = useState(true);

  const [liveRequests, setLiveRequests] = useState<LiveRequest[]>([]);
  const [liveRequestsLoading, setLiveRequestsLoading] = useState(true);

  const [favorites, setFavorites] = useState<FavoritePro[]>([]);
  const [favoritesLoading, setFavoritesLoading] = useState(true);

  useEffect(() => {
    const guard = async () => {
      const { data: { user }, error: userErr } = await supabase.auth.getUser();
      if (userErr) {
        router.replace(`/auth?next=%2Fcustomer&error=${encodeURIComponent('Could not read your session.')}`);
        return;
      }
      if (!user) {
        router.replace(`/auth?next=%2Fcustomer&error=${encodeURIComponent('You are not signed in.')}`);
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
    if (!ready) return;
    let mounted = true;
    const load = async () => {
      try {
        const todayISO = new Date().toISOString().slice(0, 10);
        const res = await fetch(
          `/api/customer/bookings?from=${todayISO}&limit=20&statuses=${['requested', 'accepted', 'payment_required', 'pro_en_route', 'on_the_way', 'in_progress', 'completed_pending_payment', 'awaiting_payment'].join(',')}`,
          { cache: 'no-store', credentials: 'include' }
        );
        const json = (await res.json()) as {
          ok: boolean;
          bookings?: Array<{
            id: string;
            service_date: string;
            service_time: string;
            status: string;
            pro?: { displayName: string | null; serviceName?: string | null } | null;
          }>;
        };
        if (!mounted) return;
        if (res.ok && json.ok && json.bookings?.length) {
          const b = json.bookings[0];
          setActiveBooking({
            id: b.id,
            serviceName: b.pro?.serviceName || 'Service',
            proName: b.pro?.displayName || 'Service Pro',
            dateTime: `${b.service_date} at ${b.service_time}`,
            status: formatStatus(b.status),
          });
        } else {
          setActiveBooking(null);
        }
      } catch {
        if (mounted) setActiveBooking(null);
      } finally {
        if (mounted) setActiveBookingLoading(false);
      }
    };
    void load();
    return () => { mounted = false; };
  }, [ready]);

  useEffect(() => {
    if (!ready) return;
    let mounted = true;
    getProsForFlyerWall().then((data) => {
      if (!mounted) return;
      setNearbyPros(
        data.slice(0, 10).map((p) => ({
          id: p.id,
          name: p.name,
          categoryName: p.categoryName,
          rating: p.rating,
          startingPrice: p.startingPrice,
          profilePhotoUrl: p.profilePhotoUrl ?? p.logoUrl ?? null,
        }))
      );
      setNearbyProsLoading(false);
    }).catch(() => {
      if (mounted) setNearbyProsLoading(false);
    });
    return () => { mounted = false; };
  }, [ready]);

  useEffect(() => {
    if (!ready) return;
    let mounted = true;
    (async () => {
      try {
        const { data } = await supabase
          .from('job_requests')
          .select('id, title, budget_min, budget_max, preferred_date, preferred_time')
          .eq('status', 'open')
          .gt('expires_at', new Date().toISOString())
          .order('created_at', { ascending: false })
          .limit(3);
        if (!mounted) return;
        setLiveRequests((data ?? []) as LiveRequest[]);
      } catch {
        // ignore
      } finally {
        if (mounted) setLiveRequestsLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [ready]);

  useEffect(() => {
    if (!ready) return;
    let mounted = true;
    fetch('/api/customer/favorites', { cache: 'no-store' })
      .then((r) => r.json())
      .then((json) => {
        if (mounted && json.ok && json.favorites) setFavorites(json.favorites);
      })
      .catch(() => {})
      .finally(() => {
        if (mounted) setFavoritesLoading(false);
      });
    return () => { mounted = false; };
  }, [ready]);

  if (!ready) {
    return (
      <AppLayout mode="customer">
        <div className="min-h-[40vh] flex items-center justify-center bg-[#F5F5F5]">
          <p className="text-sm text-black/60">Loading…</p>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout mode="customer">
      <div className="min-h-screen bg-[#F5F5F5] overflow-x-hidden w-full">
        <div className="sticky top-0 z-20 bg-[#F5F5F5]/95 backdrop-blur-sm border-b border-black/10">
          <div className="w-full max-w-4xl mx-auto px-4 py-4 flex items-center justify-between min-w-0">
            <button
              type="button"
              onClick={() => setMenuOpen(true)}
              className="h-10 w-10 rounded-xl bg-[#F5F5F5] border border-black/10 text-black/70 hover:bg-[#EBEBEB]"
              aria-label="Open menu"
            >
              ☰
            </button>
            <h1 className="text-xl font-semibold text-[#111]">{userName}</h1>
            <div className="w-10" />
          </div>
        </div>

        <div className="w-full max-w-4xl mx-auto px-4 py-6 space-y-6 min-w-0">
          {/* 1. ACTIVE BOOKING */}
          <section>
            <h2 className="text-sm font-semibold text-black/70 uppercase tracking-wide mb-3">Active Booking</h2>
            {activeBookingLoading ? (
              <DashboardSectionSkeleton />
            ) : activeBooking ? (
              <DashboardCard>
                <div className="p-4">
                  <div className="font-semibold text-[#111]">{activeBooking.serviceName}</div>
                  <div className="text-sm text-black/60 mt-1">{activeBooking.proName}</div>
                  <div className="text-sm text-black/60">{activeBooking.dateTime}</div>
                  <div className="mt-2">
                    <span className="inline-block px-2 py-0.5 rounded-full bg-[#B2FBA5]/50 text-xs font-medium text-black/80">
                      {activeBooking.status}
                    </span>
                  </div>
                  <div className="flex gap-2 mt-4">
                    <Link
                      href={`/customer/bookings/${activeBooking.id}`}
                      className="flex-1 py-2 rounded-lg bg-[#B2FBA5] text-black font-semibold text-sm text-center hover:opacity-95"
                    >
                      View Booking
                    </Link>
                    <Link
                      href={`/customer/chat/${activeBooking.id}`}
                      className="flex-1 py-2 rounded-lg border border-black/15 text-black/80 font-semibold text-sm text-center hover:bg-black/5"
                    >
                      Message Pro
                    </Link>
                  </div>
                </div>
              </DashboardCard>
            ) : (
              <DashboardCard>
                <div className="p-4">
                  <div className="font-semibold text-[#111]">No active booking</div>
                  <div className="text-sm text-black/60 mt-1">When you book a pro, it will show here.</div>
                  <Link href="/occupations" className="mt-3 inline-block text-sm font-medium text-[#111] hover:underline">
                    Browse occupations →
                  </Link>
                </div>
              </DashboardCard>
            )}
          </section>

          {/* 2. QUICK ACTIONS */}
          <section>
            <h2 className="text-sm font-semibold text-black/70 uppercase tracking-wide mb-3">Quick Actions</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Link href="/customer/categories" className="block">
                <DashboardCard>
                  <div className="p-5 text-center">
                    <div className="text-base font-semibold text-[#111]">Book Service</div>
                    <div className="text-xs text-black/60 mt-1">Find a pro</div>
                  </div>
                </DashboardCard>
              </Link>
              <Link href="/customer/requests/new" className="block">
                <DashboardCard>
                  <div className="p-5 text-center">
                    <div className="text-base font-semibold text-[#111]">Post Request</div>
                    <div className="text-xs text-black/60 mt-1">Get offers from pros</div>
                  </div>
                </DashboardCard>
              </Link>
              <Link href="/flyer-wall" className="block">
                <DashboardCard>
                  <div className="p-5 text-center">
                    <div className="text-base font-semibold text-[#111]">Browse Flyer Wall</div>
                    <div className="text-xs text-black/60 mt-1">Discover pros</div>
                  </div>
                </DashboardCard>
              </Link>
            </div>
          </section>

          {/* 3. NEARBY PROS */}
          <section>
            <h2 className="text-sm font-semibold text-black/70 uppercase tracking-wide mb-3">Nearby Pros</h2>
            {nearbyProsLoading ? (
              <div className="flex gap-3 overflow-hidden">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-36 w-40 shrink-0 rounded-xl bg-gray-200 animate-pulse" />
                ))}
              </div>
            ) : nearbyPros.length > 0 ? (
              <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 sm:mx-0 sm:px-0">
                {nearbyPros.map((pro) => (
                  <Link key={pro.id} href={`/customer/pros/${pro.id}`} className="shrink-0 w-40">
                    <DashboardCard>
                      <div className="p-3">
                        <div className="w-12 h-12 rounded-full overflow-hidden bg-[#F5F5F5]/50 mx-auto mb-2">
                          {pro.profilePhotoUrl ? (
                            <Image src={pro.profilePhotoUrl} alt="" width={48} height={48} className="object-cover w-full h-full" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-sm font-semibold text-black/40">
                              {getInitials(pro.name)}
                            </div>
                          )}
                        </div>
                        <div className="font-medium text-sm text-[#111] truncate">{pro.name}</div>
                        <div className="text-xs text-black/60 mt-0.5">{pro.categoryName}</div>
                        <div className="flex items-center gap-1 mt-1">
                          <span className="text-amber-500 text-xs">★</span>
                          <span className="text-xs font-medium">{pro.rating.toFixed(1)}</span>
                        </div>
                        <div className="text-xs text-black/60 mt-0.5">
                          ${pro.startingPrice}–${Math.ceil(pro.startingPrice * 1.2)}
                        </div>
                      </div>
                    </DashboardCard>
                  </Link>
                ))}
              </div>
            ) : (
              <DashboardCard>
                <div className="p-4">
                  <div className="text-sm font-medium text-[#111]">No pros nearby</div>
                  <Link href="/flyer-wall" className="mt-2 inline-block text-sm text-[#111] hover:underline">
                    Browse Flyer Wall →
                  </Link>
                </div>
              </DashboardCard>
            )}
          </section>

          {/* 4. LIVE REQUESTS */}
          <section>
            <h2 className="text-sm font-semibold text-black/70 uppercase tracking-wide mb-3">Live Requests</h2>
            {liveRequestsLoading ? (
              <DashboardSectionSkeleton />
            ) : liveRequests.length > 0 ? (
              <div className="space-y-2">
                {liveRequests.map((r) => {
                  const prefDate = r.preferred_date ? new Date(r.preferred_date) : null;
                  const isToday = prefDate && prefDate.toDateString() === new Date().toDateString();
                  const needLabel = isToday
                    ? 'Need Today'
                    : prefDate
                      ? `Need ${prefDate.toLocaleDateString()}`
                      : null;
                  return (
                    <DashboardCard key={r.id}>
                      <div className="p-4">
                        <div className="font-semibold text-[#111]">{r.title}</div>
                        <div className="text-sm text-black/60 mt-1">
                          Budget ${r.budget_min ?? '?'}–${r.budget_max ?? '?'}
                          {needLabel && (
                            <span className="ml-2">• {needLabel}</span>
                          )}
                          {r.preferred_time && (
                            <span className="ml-2">{r.preferred_time}</span>
                          )}
                        </div>
                      </div>
                    </DashboardCard>
                  );
                })}
                <Link
                  href="/customer/requests"
                  className="block"
                >
                  <DashboardCard>
                    <div className="p-4 text-center font-semibold text-[#111]">View Requests</div>
                  </DashboardCard>
                </Link>
              </div>
            ) : (
              <DashboardCard>
                <div className="p-4">
                  <div className="text-sm font-medium text-[#111]">No live requests</div>
                  <Link href="/customer/requests/new" className="mt-2 inline-block text-sm text-[#111] hover:underline">
                    Post a request →
                  </Link>
                </div>
              </DashboardCard>
            )}
          </section>

          {/* 5. FAVORITE PROS */}
          <section>
            <h2 className="text-sm font-semibold text-black/70 uppercase tracking-wide mb-3">Favorite Pros</h2>
            {favoritesLoading ? (
              <DashboardSectionSkeleton />
            ) : favorites.length > 0 ? (
              <div className="space-y-2">
                {favorites.map((f) => (
                  <DashboardCard key={f.proId}>
                    <Link href={`/book/${f.proId}`} className="block p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full overflow-hidden bg-[#F5F5F5]/50 shrink-0">
                          {f.pro?.logoUrl ? (
                            <Image src={f.pro.logoUrl} alt="" width={40} height={40} className="object-cover w-full h-full" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-sm font-semibold text-black/40">
                              {getInitials(f.pro?.displayName ?? 'Pro')}
                            </div>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="font-medium text-[#111]">{f.pro?.displayName || 'Pro'}</div>
                          <div className="text-xs text-black/60">{f.pro?.serviceName || 'Service'}</div>
                        </div>
                        <span className="shrink-0 px-3 py-1.5 rounded-lg bg-[#B2FBA5] text-black font-semibold text-sm">
                          Rebook
                        </span>
                      </div>
                    </Link>
                  </DashboardCard>
                ))}
                <Link href="/customer/favorites" className="block text-sm font-medium text-black/60 hover:text-[#111]">
                  View all favorites →
                </Link>
              </div>
            ) : (
              <DashboardCard>
                <div className="p-4">
                  <div className="text-sm font-medium text-[#111]">No favorite pros yet</div>
                  <div className="text-xs text-black/60 mt-1">Save pros for quick rebooking.</div>
                  <Link href="/occupations" className="mt-2 inline-block text-sm text-[#111] hover:underline">
                    Browse occupations →
                  </Link>
                </div>
              </DashboardCard>
            )}
          </section>
        </div>
      </div>
      <SideMenu open={menuOpen} onClose={() => setMenuOpen(false)} mode="customer" userName={userName} />
    </AppLayout>
  );
}
