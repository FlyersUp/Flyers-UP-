'use client';

/**
 * Customer Dashboard — Airbnb Trips / Uber Rides / DoorDash
 * Help users quickly understand current bookings and take action.
 *
 * Structure:
 * 1. Active booking card (priority)
 * 2. Pending requests
 * 3. Past bookings list
 * 4. Saved pros (optional)
 *
 * States: loading, empty, error
 */

import { useEffect, useState } from 'react';
import { AppLayout } from '@/components/layouts/AppLayout';
import { CustomerPageShell } from '@/components/customer/CustomerPageShell';
import { DashboardCard, DashboardSectionSkeleton } from '@/components/dashboard/DashboardCard';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { getOrCreateProfile, routeAfterAuth } from '@/lib/onboarding';
import { ChevronRight, Calendar, MessageCircle } from 'lucide-react';
import { BookingStatusPill } from '@/components/bookings/BookingStatusPill';
import { MiniScheduleWidget } from '@/components/calendar/MiniScheduleWidget';
import type { CalendarEvent } from '@/lib/calendar/event-from-booking';
import { perfLog, perfLoggingEnabled } from '@/lib/perfBoot';
import { DateTime } from 'luxon';
import { DEFAULT_BOOKING_TIMEZONE, todayIsoInBookingTimezone } from '@/lib/datetime';
import { useLaunchMode } from '@/hooks/useLaunchMode';

type ActiveBooking = {
  id: string;
  serviceName: string;
  proName: string;
  proLogoUrl?: string | null;
  dateTime: string;
  status: string;
  statusLabel: string;
};

type PastBooking = {
  id: string;
  serviceName: string;
  proName: string;
  proLogoUrl?: string | null;
  dateTime: string;
  status: string;
  price: number | null;
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

const ACTIVE_STATUSES =
  'requested,pending,accepted,payment_required,pro_en_route,on_the_way,in_progress,completed_pending_payment,awaiting_payment';
const COMPLETED_STATUSES = 'completed,paid,awaiting_customer_confirmation';

function formatStatus(s: string): string {
  const lower = (s || '').toLowerCase();
  if (lower === 'accepted') return 'Scheduled';
  if (lower === 'on_the_way' || lower === 'pro_en_route') return 'On the way';
  if (lower === 'in_progress') return 'In progress';
  if (lower === 'awaiting_payment' || lower === 'completed_pending_payment') return 'Payment due';
  if (lower === 'completed' || lower === 'paid') return 'Completed';
  return s.replace(/_/g, ' ');
}

function getInitials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .map((s) => s[0])
    .slice(0, 2)
    .join('')
    .toUpperCase() || '?';
}

export default function CustomerDashboard() {
  const router = useRouter();
  const [userName, setUserName] = useState('Account');
  const [userId, setUserId] = useState<string | null>(null);
  /** idle: no session yet; shell: session ok, profile or route still resolving; ready: dashboard data may load */
  const [boot, setBoot] = useState<'idle' | 'shell' | 'ready'>('idle');

  const [activeBooking, setActiveBooking] = useState<ActiveBooking | null>(null);
  const [activeLoading, setActiveLoading] = useState(true);

  const [pastBookings, setPastBookings] = useState<PastBooking[]>([]);
  const [pastLoading, setPastLoading] = useState(true);

  const [liveRequests, setLiveRequests] = useState<LiveRequest[]>([]);
  const [requestsLoading, setRequestsLoading] = useState(true);
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([]);

  const [favorites, setFavorites] = useState<FavoritePro[]>([]);
  const [favoritesLoading, setFavoritesLoading] = useState(true);

  useEffect(() => {
    if (!launchMode) return;
    setRequestsLoading(false);
    setFavoritesLoading(false);
  }, [launchMode]);

  useEffect(() => {
    const guard = async () => {
      const tAuth =
        perfLoggingEnabled() && typeof performance !== 'undefined' ? performance.now() : 0;
      const {
        data: { user },
        error: userErr,
      } = await supabase.auth.getUser();
      if (perfLoggingEnabled() && typeof performance !== 'undefined') {
        perfLog('dashboard auth.getUser', performance.now() - tAuth);
      }
      if (userErr) {
        router.replace(`/auth?next=%2Fcustomer&error=${encodeURIComponent('Could not read your session.')}`);
        return;
      }
      if (!user) {
        router.replace(`/auth?next=%2Fcustomer&error=${encodeURIComponent('You are not signed in.')}`);
        return;
      }
      const fallbackName = (user.email ? user.email.split('@')[0] : 'Account') || 'Account';
      setUserName(fallbackName);
      setUserId(user.id);
      setBoot('shell');

      const tProf =
        perfLoggingEnabled() && typeof performance !== 'undefined' ? performance.now() : 0;
      const profile = await getOrCreateProfile(user.id, user.email ?? null);
      if (perfLoggingEnabled() && typeof performance !== 'undefined') {
        perfLog('dashboard getOrCreateProfile', performance.now() - tProf);
      }
      if (!profile) return;
      const first = profile.first_name?.trim();
      const last = profile.last_name?.trim();
      setUserName([first, last].filter(Boolean).join(' ') || fallbackName);
      const dest = routeAfterAuth(profile, '/customer');
      if (dest !== '/customer') {
        router.replace(dest);
        return;
      }
      setBoot('ready');
    };
    void guard();
  }, [router]);

  useEffect(() => {
    if (boot !== 'ready') return;
    let mounted = true;
    const todayISO = todayIsoInBookingTimezone(DEFAULT_BOOKING_TIMEZONE);
    fetch(
      `/api/customer/bookings?from=${todayISO}&limit=5&statuses=${ACTIVE_STATUSES}`,
      { cache: 'no-store', credentials: 'include' }
    )
      .then((r) => r.json())
      .then((json: { ok?: boolean; bookings?: Array<{ id: string; service_date: string; service_time: string; status: string; pro?: { displayName: string | null; logoUrl?: string | null; serviceName?: string | null } | null }> }) => {
        if (!mounted) return;
        if (json.ok && json.bookings?.length) {
          const b = json.bookings[0];
          setActiveBooking({
            id: b.id,
            serviceName: b.pro?.serviceName || 'Service',
            proName: b.pro?.displayName || 'Service Pro',
            proLogoUrl: b.pro?.logoUrl,
            dateTime: `${b.service_date} at ${b.service_time}`,
            status: b.status,
            statusLabel: formatStatus(b.status),
          });
        } else {
          setActiveBooking(null);
        }
      })
      .catch(() => {
        if (mounted) setActiveBooking(null);
      })
      .finally(() => {
        if (mounted) setActiveLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [boot]);

  useEffect(() => {
    if (boot !== 'ready') return;
    let mounted = true;
    fetch(`/api/customer/bookings?limit=5&statuses=${COMPLETED_STATUSES}`, {
      cache: 'no-store',
      credentials: 'include',
    })
      .then((r) => r.json())
      .then((json: { ok?: boolean; bookings?: Array<{ id: string; service_date: string; service_time: string; status: string; price: number | null; pro?: { displayName: string | null; logoUrl?: string | null; serviceName?: string | null } | null }> }) => {
        if (!mounted) return;
        if (json.ok && json.bookings) {
          setPastBookings(
            json.bookings.map((b) => ({
              id: b.id,
              serviceName: b.pro?.serviceName || 'Service',
              proName: b.pro?.displayName || 'Service Pro',
              proLogoUrl: b.pro?.logoUrl,
              dateTime: `${b.service_date} at ${b.service_time}`,
              status: b.status,
              price: b.price,
            }))
          );
        } else {
          setPastBookings([]);
        }
      })
      .catch(() => {
        if (mounted) setPastBookings([]);
      })
      .finally(() => {
        if (mounted) setPastLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [boot]);

  useEffect(() => {
    if (boot !== 'ready' || !userId || launchMode) return;
    let mounted = true;
    (async () => {
      try {
        const { data } = await supabase
          .from('job_requests')
          .select('id, title, budget_min, budget_max, preferred_date, preferred_time')
          .eq('customer_id', userId)
          .eq('status', 'open')
          .gt('expires_at', new Date().toISOString())
          .order('created_at', { ascending: false })
          .limit(5);

        if (!mounted) return;
        setLiveRequests((data ?? []) as LiveRequest[]);
      } catch {
        if (!mounted) return;
        setLiveRequests([]);
      } finally {
        if (mounted) setRequestsLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [boot, userId, launchMode]);

  useEffect(() => {
    if (boot !== 'ready' || launchMode) return;
    let mounted = true;
    const today = todayIsoInBookingTimezone(DEFAULT_BOOKING_TIMEZONE);
    const to =
      DateTime.fromISO(today, { zone: DEFAULT_BOOKING_TIMEZONE }).plus({ days: 60 }).toISODate() ??
      today;
    fetch(`/api/calendar/events?role=customer&from=${today}&to=${to}`, { cache: 'no-store' })
      .then((r) => r.json())
      .then((json: { ok?: boolean; events?: CalendarEvent[] }) => {
        if (mounted && json.ok && Array.isArray(json.events)) setCalendarEvents(json.events);
      })
      .catch(() => {});
    return () => { mounted = false; };
  }, [boot, launchMode]);

  useEffect(() => {
    if (boot !== 'ready' || launchMode) return;
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
    return () => {
      mounted = false;
    };
  }, [boot, launchMode]);

  if (boot === 'idle') {
    return (
      <AppLayout mode="customer">
        <div className="min-h-[40vh] flex items-center justify-center bg-bg">
          <p className="text-sm text-muted">Loading…</p>
        </div>
      </AppLayout>
    );
  }

  if (boot === 'shell') {
    return (
      <AppLayout mode="customer">
        <CustomerPageShell title={userName} userName={userName}>
          <div className="max-w-4xl w-full min-w-0 mx-auto px-4 pt-2 pb-8 space-y-8">
            <DashboardSectionSkeleton />
            <DashboardSectionSkeleton />
            <DashboardSectionSkeleton />
          </div>
        </CustomerPageShell>
      </AppLayout>
    );
  }

  return (
    <AppLayout mode="customer">
      <CustomerPageShell title={userName} userName={userName}>
        <div className="max-w-4xl w-full min-w-0 mx-auto px-4 pt-2 pb-8 space-y-8">
          {/* 1. ACTIVE BOOKING (priority) */}
          <section>
            <h2 className="text-xs font-semibold text-muted uppercase tracking-wider mb-3">
              Active booking
            </h2>
            {activeLoading ? (
              <DashboardSectionSkeleton />
            ) : activeBooking ? (
              <Link href={`/customer/bookings/${activeBooking.id}`}>
                <DashboardCard className="overflow-hidden">
                  <div className="p-5">
                    <div className="flex items-start gap-4">
                      <div className="w-14 h-14 rounded-2xl overflow-hidden bg-surface2 shrink-0 flex items-center justify-center">
                        {activeBooking.proLogoUrl ? (
                          <Image
                            src={activeBooking.proLogoUrl}
                            alt=""
                            width={56}
                            height={56}
                            className="object-cover w-full h-full"
                          />
                        ) : (
                          <span className="text-lg font-semibold text-muted">
                            {getInitials(activeBooking.proName)}
                          </span>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="font-semibold text-text">{activeBooking.serviceName}</div>
                        <div className="text-sm text-muted mt-0.5">{activeBooking.proName}</div>
                        <div className="flex items-center gap-1.5 mt-2 text-sm text-muted">
                          <Calendar size={14} strokeWidth={2} />
                          {activeBooking.dateTime}
                        </div>
                        <div className="mt-2">
                          <BookingStatusPill status={activeBooking.status} />
                        </div>
                      </div>
                      <ChevronRight size={20} className="text-muted shrink-0" />
                    </div>
                    <div className="flex gap-2 mt-4 pt-4 border-t border-border">
                      <Link
                        href={`/customer/bookings/${activeBooking.id}`}
                        className="flex-1 py-2.5 rounded-xl bg-accent text-accentContrast font-semibold text-sm text-center hover:opacity-95 transition-opacity"
                        onClick={(e) => e.stopPropagation()}
                      >
                        View details
                      </Link>
                      <Link
                        href={`/customer/chat/${activeBooking.id}`}
                        className="flex-1 py-2.5 rounded-xl border border-border text-text font-semibold text-sm text-center hover:bg-surface2 transition-colors flex items-center justify-center gap-1.5"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <MessageCircle size={16} strokeWidth={2} />
                        Message
                      </Link>
                    </div>
                  </div>
                </DashboardCard>
              </Link>
            ) : (
              <DashboardCard>
                <div className="p-5">
                  <div className="font-semibold text-text">No active booking</div>
                  <div className="text-sm text-muted mt-1">When you book a pro, it will show here.</div>
                  <Link
                    href="/occupations"
                    className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-accent hover:underline"
                  >
                    Find a pro <ChevronRight size={16} />
                  </Link>
                </div>
              </DashboardCard>
            )}
          </section>

          {/* 1b. MINI SCHEDULE */}
          {!launchMode ? (
            <section>
              <h2 className="text-xs font-semibold text-muted uppercase tracking-wider mb-3">
                Schedule
              </h2>
              <MiniScheduleWidget events={calendarEvents} mode="customer" detailHref="/customer/calendar" />
            </section>
          ) : null}

          {/* 2. PENDING REQUESTS */}
          {!launchMode ? (
          <section>
            <h2 className="text-xs font-semibold text-muted uppercase tracking-wider mb-3">
              Pending requests
            </h2>
            {requestsLoading ? (
              <DashboardSectionSkeleton />
            ) : liveRequests.length > 0 ? (
              <div className="space-y-2">
                {liveRequests.slice(0, 3).map((r) => {
                  const prefDate = r.preferred_date ? new Date(r.preferred_date) : null;
                  const isToday =
                    prefDate && prefDate.toDateString() === new Date().toDateString();
                  const needLabel = isToday
                    ? 'Today'
                    : prefDate
                      ? prefDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                      : null;
                  return (
                    <Link key={r.id} href="/customer/requests">
                      <DashboardCard>
                        <div className="p-4 flex items-center justify-between gap-3 min-w-0">
                          <div className="min-w-0 flex-1">
                            <div className="font-medium text-text break-words line-clamp-2">{r.title}</div>
                            <div className="text-sm text-muted mt-0.5 break-words">
                              ${r.budget_min ?? '?'}–${r.budget_max ?? '?'}
                              {needLabel && (
                                <span className="ml-2">• {needLabel}</span>
                              )}
                              {r.preferred_time && (
                                <span className="ml-2">{r.preferred_time}</span>
                              )}
                            </div>
                          </div>
                          <ChevronRight size={18} className="text-muted shrink-0" />
                        </div>
                      </DashboardCard>
                    </Link>
                  );
                })}
                <Link
                  href="/customer/requests"
                  className="block text-sm font-medium text-muted hover:text-text transition-colors"
                >
                  View all requests →
                </Link>
              </div>
            ) : (
              <DashboardCard>
                <div className="p-5">
                  <div className="text-sm font-medium text-text">No pending requests</div>
                  <div className="text-xs text-muted mt-1">Open requests awaiting offers will appear here.</div>
                  <Link
                    href="/customer/requests/new"
                    className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-accent hover:underline"
                  >
                    Post a request <ChevronRight size={16} />
                  </Link>
                </div>
              </DashboardCard>
            )}
          </section>
          ) : null}

          {/* 3. PAST BOOKINGS */}
          <section>
            <h2 className="text-xs font-semibold text-muted uppercase tracking-wider mb-3">
              Past bookings
            </h2>
            {pastLoading ? (
              <DashboardSectionSkeleton />
            ) : pastBookings.length > 0 ? (
              <div className="space-y-2">
                {pastBookings.map((b) => (
                  <Link key={b.id} href={`/customer/bookings/${b.id}`}>
                    <DashboardCard>
                      <div className="p-4 flex items-center gap-4">
                        <div className="w-11 h-11 rounded-xl overflow-hidden bg-surface2 shrink-0 flex items-center justify-center">
                          {b.proLogoUrl ? (
                            <Image
                              src={b.proLogoUrl}
                              alt=""
                              width={44}
                              height={44}
                              className="object-cover w-full h-full"
                            />
                          ) : (
                            <span className="text-sm font-semibold text-muted">
                              {getInitials(b.proName)}
                            </span>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="font-medium text-text truncate">{b.proName}</div>
                          <div className="text-xs text-muted">{b.serviceName} • {b.dateTime}</div>
                        </div>
                        <div className="shrink-0 text-right">
                          {b.price != null && (
                            <div className="text-sm font-semibold text-text">
                              ${b.price.toFixed(0)}
                            </div>
                          )}
                          <ChevronRight size={18} className="text-muted mt-0.5" />
                        </div>
                      </div>
                    </DashboardCard>
                  </Link>
                ))}
                <Link
                  href="/customer/bookings/history"
                  className="block text-sm font-medium text-muted hover:text-text transition-colors"
                >
                  View all history →
                </Link>
              </div>
            ) : (
              <DashboardCard>
                <div className="p-4">
                  <div className="text-sm font-medium text-text">No past bookings</div>
                  <div className="text-xs text-muted mt-0.5">Completed bookings will appear here.</div>
                </div>
              </DashboardCard>
            )}
          </section>

          {/* 4. SAVED PROS (optional) */}
          {!launchMode ? (
          <section>
            <h2 className="text-xs font-semibold text-muted uppercase tracking-wider mb-3">
              Saved pros
            </h2>
            {favoritesLoading ? (
              <DashboardSectionSkeleton />
            ) : favorites.length > 0 ? (
              <div className="space-y-2">
                {favorites.slice(0, 4).map((f) => (
                  <Link key={f.proId} href={`/book/${f.proId}`}>
                    <DashboardCard>
                      <div className="p-4 flex items-center gap-4">
                        <div className="w-11 h-11 rounded-xl overflow-hidden bg-surface2 shrink-0 flex items-center justify-center">
                          {f.pro?.logoUrl ? (
                            <Image
                              src={f.pro.logoUrl}
                              alt=""
                              width={44}
                              height={44}
                              className="object-cover w-full h-full"
                            />
                          ) : (
                            <span className="text-sm font-semibold text-muted">
                              {getInitials(f.pro?.displayName ?? 'Pro')}
                            </span>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="font-medium text-text truncate">
                            {f.pro?.displayName || 'Pro'}
                          </div>
                          <div className="text-xs text-muted">{f.pro?.serviceName || 'Service'}</div>
                        </div>
                        <span className="shrink-0 px-3 py-1.5 rounded-lg bg-accent text-accentContrast text-xs font-semibold">
                          Rebook
                        </span>
                      </div>
                    </DashboardCard>
                  </Link>
                ))}
                <Link
                  href="/customer/favorites"
                  className="block text-sm font-medium text-muted hover:text-text transition-colors"
                >
                  View all favorites →
                </Link>
              </div>
            ) : (
              <DashboardCard>
                <div className="p-4">
                  <div className="text-sm font-medium text-text">No saved pros yet</div>
                  <div className="text-xs text-muted mt-0.5">Save pros for quick rebooking.</div>
                  <Link
                    href="/occupations"
                    className="mt-2 inline-block text-sm text-accent hover:underline"
                  >
                    Browse occupations →
                  </Link>
                </div>
              </DashboardCard>
            )}
          </section>
          ) : null}
        </div>
      </CustomerPageShell>
    </AppLayout>
  );
}
