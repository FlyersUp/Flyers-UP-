'use client';

/**
 * Pro Jobs - unified job discovery
 * Tabs: Incoming (requests sent directly to pro), Open Jobs (demand board / marketplace)
 */
import { useEffect, useState, useRef } from 'react';
import { AppLayout } from '@/components/layouts/AppLayout';
import { DashboardCard, DashboardSectionSkeleton } from '@/components/dashboard/DashboardCard';
import { useProPresence } from '@/hooks/useProPresence';
import { SideMenu } from '@/components/ui/SideMenu';
import { getCurrentUser } from '@/lib/api';
import { isAppleAppReviewAccountEmail } from '@/lib/appleAppReviewAccount';
import { AppReviewProOpenJobsDemoPanel } from '@/components/apple-review/AppReviewProOpenJobsDemoPanel';
import { supabase } from '@/lib/supabaseClient';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

type BoardService = {
  serviceSlug: string;
  openRequests: number;
  prosOnline: number;
  surgeMultiplier: number;
  basePriceMinCents: number | null;
  basePriceMaxCents: number | null;
};

type BoardRequest = {
  id: string;
  service_slug: string;
  borough: string | null;
  neighborhood: string | null;
  surge_multiplier: number;
  base_price_cents: number;
  final_price_cents: number;
};

type CustomerJobRequest = {
  id: string;
  title: string;
  description: string | null;
  service_category: string;
  location: string;
  location_zip: string | null;
  budget_min: number | null;
  budget_max: number | null;
  preferred_date: string | null;
  preferred_time: string | null;
  created_at: string;
  expires_at: string;
};

type OpenJobFilterMeta = {
  categorySlug: string;
  categoryName: string;
  zip: string | null;
  zipValid: boolean;
  radiusMiles: number;
  profileZip: string | null;
  zipWarning?: string;
  radiusOptions: number[];
};

function formatServiceName(slug: string): string {
  return slug
    .split(/[-_]/)
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
    .join(' ');
}

function formatSurgeBadge(mult: number): string {
  if (mult <= 1) return '—';
  const pct = Math.round((mult - 1) * 100);
  return `+${pct}%`;
}

/** Pre-1.2: hide customer ZIP/radius browse until the feature ships */
const CUSTOMER_REQUESTS_ENABLED = false;

function OpenJobsUnifiedEmpty() {
  return (
    <div className="space-y-4">
      <DashboardCard>
        <div className="p-6 text-center">
          <p className="text-base font-semibold text-gray-900 dark:text-white">No open jobs yet</p>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
            New jobs will appear here when customers book in your area.
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-500 mt-3 max-w-md mx-auto">
            Make sure your profile, ZIP code, and notifications are set up to get matched faster.
          </p>
        </div>
      </DashboardCard>
      <DashboardCard className="opacity-70 border-dashed">
        <div className="p-4 text-center">
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Customer Requests (Coming Soon)</p>
          <p className="text-xs text-gray-500 dark:text-gray-500 mt-1.5">
            Soon you&apos;ll be able to browse and accept nearby customer requests instantly.
          </p>
        </div>
      </DashboardCard>
    </div>
  );
}

function CustomerRequestsSection({
  filterMeta,
  draftZip,
  setDraftZip,
  draftRadius,
  setDraftRadius,
  setAppliedZip,
  setAppliedRadius,
  customerLoading,
  customerRequests,
}: {
  filterMeta: OpenJobFilterMeta | null;
  draftZip: string;
  setDraftZip: (v: string) => void;
  draftRadius: number;
  setDraftRadius: (v: number) => void;
  setAppliedZip: (v: string) => void;
  setAppliedRadius: (v: number) => void;
  customerLoading: boolean;
  customerRequests: CustomerJobRequest[];
}) {
  return (
    <div className="mb-6 space-y-3">
      <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">Customer requests</h2>
      <p className="text-xs text-gray-600 dark:text-gray-400">
        Jobs customers post on the app. Filter by ZIP and how far you&apos;ll travel (
        {filterMeta?.categoryName ?? 'your occupation'} only).
      </p>
      {filterMeta?.zipWarning && (
        <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-100 text-sm">
          {filterMeta.zipWarning}
        </div>
      )}
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">ZIP code</label>
          <input
            type="text"
            inputMode="numeric"
            maxLength={5}
            value={draftZip}
            onChange={(e) => setDraftZip(e.target.value.replace(/\D/g, '').slice(0, 5))}
            placeholder="Your ZIP"
            className="w-28 px-3 py-2 rounded-lg bg-surface border border-border text-gray-900 dark:text-white text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Radius</label>
          <select
            value={draftRadius}
            onChange={(e) => setDraftRadius(Number(e.target.value))}
            className="px-3 py-2 rounded-lg bg-surface border border-border text-gray-900 dark:text-white text-sm"
          >
            {(filterMeta?.radiusOptions ?? [5, 10, 15, 25, 35, 50]).map((miles) => (
              <option key={miles} value={miles}>
                {miles} mi
              </option>
            ))}
          </select>
        </div>
        <button
          type="button"
          onClick={() => {
            setAppliedZip(draftZip.replace(/\D/g, '').slice(0, 5));
            setAppliedRadius(draftRadius);
          }}
          className="px-4 py-2 rounded-lg bg-[#FFC067] text-black font-semibold text-sm hover:opacity-95"
        >
          Apply filter
        </button>
      </div>
      {!filterMeta?.profileZip && !filterMeta?.zip && (
        <p className="text-xs text-gray-500 dark:text-gray-400">
          Add a service ZIP in Business settings to default your search, or enter a ZIP above.
        </p>
      )}
      {customerLoading ? (
        <DashboardSectionSkeleton />
      ) : customerRequests.length === 0 ? (
        <DashboardCard>
          <div className="p-4 text-center text-sm text-gray-600 dark:text-gray-400">
            No matching customer requests. Try a wider radius or a nearby ZIP.
          </div>
        </DashboardCard>
      ) : (
        <div className="space-y-2">
          {customerRequests.map((r) => (
            <Link key={r.id} href={`/pro/requests/${r.id}`}>
              <DashboardCard>
                <div className="p-4 flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <div className="font-medium text-gray-900 dark:text-white">{r.title}</div>
                    <div className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">
                      {r.location_zip && (
                        <span className="font-medium text-gray-800 dark:text-gray-200">ZIP {r.location_zip} · </span>
                      )}
                      {r.location}
                    </div>
                    <div className="text-xs text-gray-500 mt-1 capitalize">{r.service_category.replace(/-/g, ' ')}</div>
                  </div>
                  <span className="text-muted shrink-0">→</span>
                </div>
              </DashboardCard>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function MarketplaceBoard({
  boardServices,
  boardRequests,
  claimingId,
  onClaim,
}: {
  boardServices: BoardService[];
  boardRequests: BoardRequest[];
  claimingId: string | null;
  onClaim: (requestId: string) => void;
}) {
  return (
    <div className="space-y-4">
      <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">Marketplace board</h2>
      <p className="text-xs text-gray-600 dark:text-gray-400 -mt-1 mb-1">
        Quick-demand listings you can claim from the board.
      </p>
      {boardServices.map((svc) => (
        <DashboardCard key={svc.serviceSlug}>
          <div className="p-4">
            <div className="font-semibold text-gray-900 dark:text-white">{formatServiceName(svc.serviceSlug)}</div>
            <div className="flex flex-wrap gap-2 mt-2 text-sm text-gray-600 dark:text-gray-300">
              <span>{svc.openRequests} open requests</span>
              <span>•</span>
              <span>{svc.prosOnline} pros online</span>
              {svc.surgeMultiplier > 1 && (
                <>
                  <span>•</span>
                  <span className="font-medium text-[#FFC067]">{formatSurgeBadge(svc.surgeMultiplier)} surge</span>
                </>
              )}
            </div>
            {(svc.basePriceMinCents != null || svc.basePriceMaxCents != null) && (
              <div className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                Suggested: ${(svc.basePriceMinCents ?? 0) / 100}–${(svc.basePriceMaxCents ?? 0) / 100}
              </div>
            )}
          </div>
        </DashboardCard>
      ))}

      {boardRequests.length > 0 && (
        <div className="mt-6">
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide mb-3">Demand listings</h2>
          <div className="space-y-2">
            {boardRequests.map((r) => (
              <DashboardCard key={r.id}>
                <div className="p-4 flex items-center justify-between gap-4">
                  <div>
                    <div className="font-medium text-gray-900 dark:text-white">{formatServiceName(r.service_slug)}</div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      {(r.borough || r.neighborhood) && `${r.borough ?? ''} ${r.neighborhood ?? ''}`.trim()}
                      {r.final_price_cents > 0 && ` • $${r.final_price_cents / 100}`}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => onClaim(r.id)}
                    disabled={!!claimingId}
                    className="shrink-0 px-4 py-2 rounded-lg bg-[#FFC067] text-black font-semibold text-sm hover:opacity-95 disabled:opacity-60"
                  >
                    {claimingId === r.id ? 'Claiming…' : 'Claim Job'}
                  </button>
                </div>
              </DashboardCard>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function ProJobsPage() {
  const router = useRouter();
  const [tab, setTab] = useState<'incoming' | 'open'>('open');
  const [ready, setReady] = useState(false);
  const [userName, setUserName] = useState('Account');
  /** Apple App Review: show non-blocking Open Jobs preview when the real board is empty. */
  const [isReviewAccount, setIsReviewAccount] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const [boardServices, setBoardServices] = useState<BoardService[]>([]);
  const [boardRequests, setBoardRequests] = useState<BoardRequest[]>([]);
  const [boardLoading, setBoardLoading] = useState(true);
  const [claimingId, setClaimingId] = useState<string | null>(null);
  const [claimError, setClaimError] = useState<string | null>(null);

  const [customerRequests, setCustomerRequests] = useState<CustomerJobRequest[]>([]);
  const [customerLoading, setCustomerLoading] = useState(false);
  const [filterMeta, setFilterMeta] = useState<OpenJobFilterMeta | null>(null);
  const [draftZip, setDraftZip] = useState('');
  const [draftRadius, setDraftRadius] = useState(25);
  const [appliedZip, setAppliedZip] = useState('');
  const [appliedRadius, setAppliedRadius] = useState(25);
  const filterFormSynced = useRef(false);

  const [incomingBookings, setIncomingBookings] = useState<
    Array<{
      id: string;
      service_date: string;
      service_time: string;
      address: string;
      status: string;
      price: number | null;
      customer?: { fullName: string | null; phone: string | null } | null;
    }>
  >([]);
  const [incomingLoading, setIncomingLoading] = useState(false);

  useProPresence({ enabled: ready });

  useEffect(() => {
    const guard = async () => {
      const user = await getCurrentUser();
      if (!user) {
        router.replace(`/auth?next=${encodeURIComponent('/pro/jobs')}`);
        return;
      }
      setIsReviewAccount(isAppleAppReviewAccountEmail(user.email));
      setUserName(user.email?.split('@')[0] ?? 'Account');
      const { data: pro } = await supabase
        .from('service_pros')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();
      if (!pro) {
        router.replace('/pro');
        return;
      }
      setReady(true);
    };
    void guard();
  }, [router]);

  useEffect(() => {
    if (!ready) return;
    const load = async () => {
      try {
        const res = await fetch('/api/demand/board', { cache: 'no-store' });
        const json = await res.json();
        if (res.ok && json.services) {
          setBoardServices(json.services);
          setBoardRequests(json.requests ?? []);
        }
      } catch {
        // ignore
      } finally {
        setBoardLoading(false);
      }
    };
    void load();
  }, [ready]);

  useEffect(() => {
    if (!ready || tab !== 'open' || !CUSTOMER_REQUESTS_ENABLED) return;
    setCustomerLoading(true);
    const qs = new URLSearchParams();
    const z = appliedZip.replace(/\D/g, '').slice(0, 5);
    if (z.length === 5) qs.set('zip', z);
    qs.set('radiusMiles', String(appliedRadius));
    fetch(`/api/pro/open-job-requests?${qs.toString()}`, { cache: 'no-store' })
      .then((r) => r.json())
      .then((json: { requests?: CustomerJobRequest[]; filter?: OpenJobFilterMeta }) => {
        if (Array.isArray(json.requests)) setCustomerRequests(json.requests);
        if (json.filter) {
          setFilterMeta(json.filter);
          if (!filterFormSynced.current) {
            filterFormSynced.current = true;
            const prefZip = json.filter.zip ?? json.filter.profileZip ?? '';
            setDraftZip(prefZip);
            setDraftRadius(json.filter.radiusMiles ?? 25);
            setAppliedRadius(json.filter.radiusMiles ?? 25);
          }
        }
      })
      .catch(() => setCustomerRequests([]))
      .finally(() => setCustomerLoading(false));
  }, [ready, tab, appliedZip, appliedRadius]);

  useEffect(() => {
    if (!ready || tab !== 'incoming') return;
    setIncomingLoading(true);
    const statuses = [
      'requested',
      'deposit_paid',
      'awaiting_deposit_payment',
      'payment_required',
      'accepted',
      'pending_pro_acceptance',
      'accepted_pending_payment',
    ].join(',');
    fetch(`/api/pro/bookings?limit=50&statuses=${encodeURIComponent(statuses)}`, { cache: 'no-store' })
      .then((r) => r.json())
      .then((json: { ok?: boolean; bookings?: any[] }) => {
        if (json.ok && Array.isArray(json.bookings)) {
          setIncomingBookings(json.bookings);
        } else {
          setIncomingBookings([]);
        }
      })
      .catch(() => setIncomingBookings([]))
      .finally(() => setIncomingLoading(false));
  }, [ready, tab]);

  async function handleClaim(requestId: string) {
    setClaimError(null);
    setClaimingId(requestId);
    try {
      const res = await fetch('/api/demand/claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ request_id: requestId }),
      });
      const json = await res.json();
      if (!res.ok) {
        setClaimError(json.error ?? 'Claim failed');
        return;
      }
      router.push(`/demand/claimed/${requestId}`);
    } catch {
      setClaimError('Claim failed');
    } finally {
      setClaimingId(null);
    }
  }

  if (!ready) {
    return (
      <AppLayout mode="pro">
        <div className="min-h-[40vh] flex items-center justify-center bg-bg">
          <p className="text-sm text-gray-600 dark:text-gray-300">Loading…</p>
        </div>
      </AppLayout>
    );
  }

  const hasMarketplaceListings = boardServices.length > 0 || boardRequests.length > 0;
  const customerBlockingLoad = CUSTOMER_REQUESTS_ENABLED && customerLoading;
  const showOpenJobsUnifiedEmpty =
    !boardLoading &&
    !customerBlockingLoad &&
    (!CUSTOMER_REQUESTS_ENABLED || customerRequests.length === 0) &&
    !hasMarketplaceListings;

  return (
    <AppLayout mode="pro">
      <div className="min-h-screen bg-bg">
        <div className="sticky top-0 z-20 bg-bg/95 backdrop-blur-sm border-b border-border">
          <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
            <button
              type="button"
              onClick={() => setMenuOpen(true)}
              className="h-10 w-10 rounded-xl bg-surface border border-border text-gray-900 dark:text-white hover:bg-surface2"
              aria-label="Open menu"
            >
              ☰
            </button>
            <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Jobs</h1>
            <div className="w-10" />
          </div>
          <div className="max-w-4xl mx-auto px-4 pb-3">
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setTab('incoming')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  tab === 'incoming'
                    ? 'bg-[#FFEBB0] dark:bg-amber-900/40 text-amber-900 dark:text-amber-200'
                    : 'bg-surface2 text-gray-600 dark:text-gray-300 hover:bg-surface2/80'
                }`}
              >
                Incoming
              </button>
              <button
                type="button"
                onClick={() => setTab('open')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  tab === 'open'
                    ? 'bg-[#FFEBB0] dark:bg-amber-900/40 text-amber-900 dark:text-amber-200'
                    : 'bg-surface2 text-gray-600 dark:text-gray-300 hover:bg-surface2/80'
                }`}
              >
                Open Jobs
              </button>
            </div>
          </div>
        </div>

        <div className="max-w-4xl mx-auto px-4 py-6">
          {claimError && (
            <div className="mb-4 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-200 text-sm">
              {claimError}
            </div>
          )}

          {tab === 'incoming' && (
            <>
              {incomingLoading ? (
                <div className="space-y-4">
                  <DashboardSectionSkeleton />
                  <DashboardSectionSkeleton />
                </div>
              ) : incomingBookings.length > 0 ? (
                <div className="space-y-2">
                  {incomingBookings.map((b) => (
                    <Link key={b.id} href={`/pro/jobs/${b.id}`}>
                      <DashboardCard>
                        <div className="p-4 flex items-center justify-between gap-4">
                          <div className="min-w-0 flex-1">
                            <div className="font-medium text-gray-900 dark:text-white">
                              {b.customer?.fullName || 'Customer'} • {b.service_date} {b.service_time}
                            </div>
                            <div className="text-sm text-gray-600 dark:text-gray-400 mt-0.5 truncate">
                              {b.address}
                            </div>
                            <span className="inline-block mt-2 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-200">
                              {b.status.replace(/_/g, ' ')}
                            </span>
                          </div>
                          <div className="shrink-0 text-right">
                            {b.price != null && b.price > 0 && (
                              <div className="text-lg font-bold text-amber-600 dark:text-amber-400">
                                ${Number(b.price).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                              </div>
                            )}
                            <span className="text-muted">→</span>
                          </div>
                        </div>
                      </DashboardCard>
                    </Link>
                  ))}
                </div>
              ) : (
                <DashboardCard>
                  <div className="p-6 text-center">
                    <p className="text-base font-medium text-gray-900 dark:text-white">No incoming requests</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      Requests sent directly to you will appear here.
                    </p>
                  </div>
                </DashboardCard>
              )}
            </>
          )}

          {tab === 'open' && (
            <>
              {showOpenJobsUnifiedEmpty ? (
                isReviewAccount ? <AppReviewProOpenJobsDemoPanel /> : <OpenJobsUnifiedEmpty />
              ) : (
                <>
                  {CUSTOMER_REQUESTS_ENABLED && (
                    <CustomerRequestsSection
                      filterMeta={filterMeta}
                      draftZip={draftZip}
                      setDraftZip={setDraftZip}
                      draftRadius={draftRadius}
                      setDraftRadius={setDraftRadius}
                      setAppliedZip={setAppliedZip}
                      setAppliedRadius={setAppliedRadius}
                      customerLoading={customerLoading}
                      customerRequests={customerRequests}
                    />
                  )}
                  {boardLoading ? (
                    <div className="space-y-4">
                      <DashboardSectionSkeleton />
                      <DashboardSectionSkeleton />
                    </div>
                  ) : (
                    hasMarketplaceListings && (
                      <MarketplaceBoard
                        boardServices={boardServices}
                        boardRequests={boardRequests}
                        claimingId={claimingId}
                        onClaim={handleClaim}
                      />
                    )
                  )}
                </>
              )}
            </>
          )}
        </div>
      </div>
      <SideMenu open={menuOpen} onClose={() => setMenuOpen(false)} role="pro" userName={userName} />
    </AppLayout>
  );
}
