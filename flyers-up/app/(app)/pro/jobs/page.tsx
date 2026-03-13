'use client';

/**
 * Pro Jobs - unified job discovery
 * Tabs: Incoming (requests sent directly to pro), Open Jobs (demand board / marketplace)
 */
import { useEffect, useState } from 'react';
import { AppLayout } from '@/components/layouts/AppLayout';
import { DashboardCard, DashboardSectionSkeleton } from '@/components/dashboard/DashboardCard';
import { useProPresence } from '@/hooks/useProPresence';
import { SideMenu } from '@/components/ui/SideMenu';
import { getCurrentUser } from '@/lib/api';
import { supabase } from '@/lib/supabaseClient';
import { useRouter } from 'next/navigation';

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

export default function ProJobsPage() {
  const router = useRouter();
  const [tab, setTab] = useState<'incoming' | 'open'>('open');
  const [ready, setReady] = useState(false);
  const [userName, setUserName] = useState('Account');
  const [menuOpen, setMenuOpen] = useState(false);

  const [boardServices, setBoardServices] = useState<BoardService[]>([]);
  const [boardRequests, setBoardRequests] = useState<BoardRequest[]>([]);
  const [boardLoading, setBoardLoading] = useState(true);
  const [claimingId, setClaimingId] = useState<string | null>(null);
  const [claimError, setClaimError] = useState<string | null>(null);

  useProPresence({ enabled: ready });

  useEffect(() => {
    const guard = async () => {
      const user = await getCurrentUser();
      if (!user) {
        router.replace(`/auth?next=${encodeURIComponent('/pro/jobs')}`);
        return;
      }
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
            <DashboardCard>
              <div className="p-6 text-center">
                <p className="text-base font-medium text-gray-900 dark:text-white">No incoming requests</p>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  Requests sent directly to you will appear here.
                </p>
              </div>
            </DashboardCard>
          )}

          {tab === 'open' && (
            <>
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
        </div>
      </div>
      <SideMenu open={menuOpen} onClose={() => setMenuOpen(false)} role="pro" userName={userName} />
    </AppLayout>
  );
}
