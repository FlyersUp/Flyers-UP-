'use client';

/**
 * Demand Board: marketplace view with Surge Pricing, Heatmap, Instant Job Claim
 * Tabs: Board (cards per service), Heatmap (list-based)
 * Pros see "Claim Job" on each open request.
 */
import { useEffect, useState } from 'react';
import { AppLayout } from '@/components/layouts/AppLayout';
import { DashboardCard, DashboardSectionSkeleton } from '@/components/dashboard/DashboardCard';
import { useProPresence } from '@/hooks/useProPresence';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { useLaunchMode } from '@/hooks/useLaunchMode';

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

type HeatmapCell = {
  cellKey: string;
  serviceSlug: string;
  openRequests: number;
  prosOnline: number;
  surgeMultiplier: number;
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

export default function DemandPage() {
  const router = useRouter();
  const launchMode = useLaunchMode();
  const [tab, setTab] = useState<'board' | 'heatmap'>('board');
  const [isPro, setIsPro] = useState(false);
  const [ready, setReady] = useState(false);

  const [boardServices, setBoardServices] = useState<BoardService[]>([]);
  const [boardRequests, setBoardRequests] = useState<BoardRequest[]>([]);
  const [boardLoading, setBoardLoading] = useState(true);

  const [heatmapCells, setHeatmapCells] = useState<HeatmapCell[]>([]);
  const [heatmapLoading, setHeatmapLoading] = useState(false);

  const [claimingId, setClaimingId] = useState<string | null>(null);
  const [claimError, setClaimError] = useState<string | null>(null);

  const [showPostForm, setShowPostForm] = useState(false);
  const [postService, setPostService] = useState('');
  const [postBorough, setPostBorough] = useState('');
  const [postNeighborhood, setPostNeighborhood] = useState('');
  const [postUrgency, setPostUrgency] = useState<'normal' | 'priority' | 'emergency'>('normal');
  const [postPriceCents, setPostPriceCents] = useState(10000);
  const [postSubmitting, setPostSubmitting] = useState(false);
  const [postSuccess, setPostSuccess] = useState(false);
  const [postError, setPostError] = useState<string | null>(null);
  const [availableServices, setAvailableServices] = useState<{ slug: string; name: string }[]>([]);

  useProPresence({ enabled: isPro });

  useEffect(() => {
    if (!launchMode || !ready) return;
    router.replace(isPro ? '/pro?coming_soon=1' : '/customer?coming_soon=1');
  }, [launchMode, ready, isPro, router]);

  useEffect(() => {
    fetch('/api/marketplace/services', { cache: 'no-store' })
      .then((r) => r.json())
      .then((json) => {
        if (json.services?.length) {
          const svcs = json.services.map((s: { slug: string; name: string }) => ({ slug: s.slug, name: s.name }));
          setAvailableServices(svcs);
          setPostService((prev) => prev || svcs[0].slug);
        }
      })
      .catch(() => {});
  }, []);

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
    if (tab === 'heatmap' && ready) {
      setHeatmapLoading(true);
      fetch('/api/demand/heatmap', { cache: 'no-store' })
        .then((r) => r.json())
        .then((json) => {
          setHeatmapCells(json.cells ?? []);
        })
        .catch(() => {})
        .finally(() => setHeatmapLoading(false));
    }
  }, [tab, ready]);

  useEffect(() => {
    const check = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.replace(`/auth?next=${encodeURIComponent('/demand')}`);
        return;
      }
      const { data: pro } = await supabase
        .from('service_pros')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();
      if (pro) {
        router.replace('/pro/jobs');
        return;
      }
      setIsPro(false);
      setReady(true);
    };
    void check();
  }, [router]);

  async function handlePostRequest() {
    setPostError(null);
    setPostSuccess(false);
    if (!postService) {
      setPostError('Select a service');
      return;
    }
    setPostSubmitting(true);
    try {
      const res = await fetch('/api/demand/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          service_slug: postService,
          borough: postBorough || null,
          neighborhood: postNeighborhood || null,
          urgency: postUrgency,
          base_price_cents: postPriceCents,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setPostError(json.error ?? 'Failed to post');
        return;
      }
      setPostSuccess(true);
      setShowPostForm(false);
      setPostBorough('');
      setPostNeighborhood('');
      setPostPriceCents(10000);
      setPostUrgency('normal');
      const boardRes = await fetch('/api/demand/board', { cache: 'no-store' });
      const boardJson = await boardRes.json();
      if (boardRes.ok && boardJson.services) {
        setBoardServices(boardJson.services);
        setBoardRequests(boardJson.requests ?? []);
      }
    } catch {
      setPostError('Failed to post');
    } finally {
      setPostSubmitting(false);
    }
  }

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
      <AppLayout mode="customer">
        <div className="min-h-[40vh] flex items-center justify-center bg-bg">
          <p className="text-sm text-gray-600 dark:text-gray-300">Loading…</p>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout mode={isPro ? 'pro' : 'customer'}>
      <div className="min-h-screen bg-bg">
        <div className="sticky top-0 z-20 bg-bg/95 backdrop-blur-sm border-b border-border">
          <div className="max-w-4xl mx-auto px-4 py-4">
            <h1 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">Demand Board</h1>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setTab('board')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  tab === 'board' ? 'bg-[#FFEBB0] dark:bg-amber-900/40 text-amber-900 dark:text-amber-200' : 'bg-surface2 text-gray-600 dark:text-gray-300 hover:bg-surface2/80'
                }`}
              >
                Board
              </button>
              <button
                type="button"
                onClick={() => setTab('heatmap')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  tab === 'heatmap' ? 'bg-[#FFEBB0] dark:bg-amber-900/40 text-amber-900 dark:text-amber-200' : 'bg-surface2 text-gray-600 dark:text-gray-300 hover:bg-surface2/80'
                }`}
              >
                Heatmap
              </button>
            </div>
          </div>
        </div>

        <div className="max-w-4xl mx-auto px-4 py-6">
          {claimError && (
            <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-800 text-sm">
              {claimError}
            </div>
          )}
          {postSuccess && (
            <div className="mb-4 p-3 rounded-lg bg-green-50 border border-green-200 text-green-800 text-sm">
              Request posted. Pros will see it on the board.
            </div>
          )}

          {tab === 'board' && (
            <>
              {!isPro && (
                <div className="mb-6">
                  <button
                    type="button"
                    onClick={() => setShowPostForm(!showPostForm)}
                    className="w-full rounded-xl border border-border bg-surface p-4 text-left font-medium text-gray-900 dark:text-white hover:bg-surface2"
                  >
                    {showPostForm ? '− Cancel' : '+ Post a request'}
                  </button>
                  {showPostForm && (
                    <DashboardCard>
                      <div className="p-4 space-y-4">
                        {postError && (
                          <div className="p-2 rounded bg-red-50 text-red-800 text-sm">{postError}</div>
                        )}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Service</label>
                          <select
                            value={postService}
                            onChange={(e) => setPostService(e.target.value)}
                            className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white px-3 py-2 text-sm"
                          >
                            {availableServices.map((s) => (
                              <option key={s.slug} value={s.slug}>{s.name}</option>
                            ))}
                          </select>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Borough</label>
                            <input
                              type="text"
                              value={postBorough}
                              onChange={(e) => setPostBorough(e.target.value)}
                              placeholder="e.g. Brooklyn"
                              className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white px-3 py-2 text-sm"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Neighborhood</label>
                            <input
                              type="text"
                              value={postNeighborhood}
                              onChange={(e) => setPostNeighborhood(e.target.value)}
                              placeholder="e.g. Williamsburg"
                              className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white px-3 py-2 text-sm"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Urgency</label>
                          <select
                            value={postUrgency}
                            onChange={(e) => setPostUrgency(e.target.value as 'normal' | 'priority' | 'emergency')}
                            className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white px-3 py-2 text-sm"
                          >
                            <option value="normal">Normal</option>
                            <option value="priority">Priority</option>
                            <option value="emergency">Emergency</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Starting price ($)</label>
                          <input
                            type="number"
                            min={0}
                            value={postPriceCents / 100}
                            onChange={(e) => setPostPriceCents(Math.round(parseFloat(e.target.value || '0') * 100))}
                            className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white px-3 py-2 text-sm"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={handlePostRequest}
                          disabled={postSubmitting}
                          className="rounded-lg bg-[#B2FBA5] text-black font-semibold px-4 py-2 text-sm hover:opacity-95 disabled:opacity-60"
                        >
                          {postSubmitting ? 'Posting…' : 'Post request'}
                        </button>
                      </div>
                    </DashboardCard>
                  )}
                </div>
              )}
              {boardLoading ? (
                <div className="space-y-4">
                  <DashboardSectionSkeleton />
                  <DashboardSectionSkeleton />
                </div>
              ) : (
                <div className="space-y-4">
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
                              <span className="font-medium text-[#FFC067]">
                                {formatSurgeBadge(svc.surgeMultiplier)} surge
                              </span>
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

                  {isPro && boardRequests.length > 0 && (
                    <div className="mt-6">
                      <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide mb-3">
                        Open Requests
                      </h2>
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
                                onClick={() => handleClaim(r.id)}
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

                  {boardServices.length === 0 && !boardLoading && (
                    <DashboardCard>
                      <div className="p-6 text-center text-gray-600 dark:text-gray-400">
                        No open requests yet. Check back soon.
                      </div>
                    </DashboardCard>
                  )}
                </div>
              )}
            </>
          )}

          {tab === 'heatmap' && (
            <>
              {heatmapLoading ? (
                <DashboardSectionSkeleton />
              ) : (
                <div className="space-y-2">
                  {heatmapCells.map((c, i) => (
                    <DashboardCard key={`${c.cellKey}-${c.serviceSlug}-${i}`}>
                      <div className="p-4 flex items-center justify-between gap-4">
                        <div>
                          <div className="font-medium text-gray-900 dark:text-white">{c.cellKey}</div>
                          <div className="text-sm text-gray-600 dark:text-gray-300">{formatServiceName(c.serviceSlug)}</div>
                        </div>
                        <div className="text-right text-sm">
                          <div>{c.openRequests} requests</div>
                          <div>{c.prosOnline} pros</div>
                          {c.surgeMultiplier > 1 && (
                            <div className="font-medium text-[#FFC067]">{formatSurgeBadge(c.surgeMultiplier)}</div>
                          )}
                        </div>
                      </div>
                    </DashboardCard>
                  ))}
                  {heatmapCells.length === 0 && !heatmapLoading && (
                    <DashboardCard>
                      <div className="p-6 text-center text-gray-600 dark:text-gray-300">No heatmap data.</div>
                    </DashboardCard>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
