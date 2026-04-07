'use client';

import { useState, useEffect } from 'react';
import { AppLayout } from '@/components/layouts/AppLayout';
import { ProPageShell } from '@/components/pro/ProPageShell';
import { Label } from '@/components/ui/Label';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { PriceRow } from '@/components/ui/PriceRow';
import { StatusPill } from '@/components/ui/StatusPill';
import { getProEarnings, getRecentProEarnings, type EarningsSummary, type RecentEarning } from '@/lib/api';
import { supabase } from '@/lib/supabaseClient';

function formatMoney(n: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n);
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

/**
 * Earnings / Payouts - Screen 15
 * Real earnings from pro_earnings; Stripe Connect for payouts
 */
export default function Earnings() {
  const [connect] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null;
    return new URLSearchParams(window.location.search).get('connect');
  });
  const [connectMsg] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null;
    return new URLSearchParams(window.location.search).get('msg') ?? null;
  });
  const [summary, setSummary] = useState<EarningsSummary | null>(null);
  const [recent, setRecent] = useState<RecentEarning[]>([]);
  const [loading, setLoading] = useState(true);
  const thisWeekJobs = recent.filter((item) => {
    const created = new Date(item.createdAt).getTime();
    if (Number.isNaN(created)) return false;
    return created >= Date.now() - (7 * 24 * 60 * 60 * 1000);
  }).length;
  const thisWeekEarnings = summary?.thisWeek ?? 0;
  const avgPerJob = thisWeekJobs > 0 ? thisWeekEarnings / thisWeekJobs : 0;

  useEffect(() => {
    let mounted = true;
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !mounted) {
        setLoading(false);
        return;
      }
      const [earnings, recentList] = await Promise.all([
        getProEarnings(user.id),
        getRecentProEarnings(user.id, 10),
      ]);
      if (!mounted) return;
      setSummary(earnings);
      setRecent(recentList);
      setLoading(false);
    }
    void load();
    return () => { mounted = false; };
  }, []);

  return (
    <AppLayout mode="pro">
      <ProPageShell title="Earnings">
        <div className="max-w-4xl mx-auto px-4 pt-2">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted">Earnings</h2>

        {connect ? (
          <div className="mb-4 rounded-[18px] border border-hairline bg-surface shadow-card px-5 py-4">
            <div className="flex items-center justify-between gap-3 text-sm font-semibold tracking-tight text-text">
              {connect === 'complete'
                ? 'Stripe connected'
                : connect === 'pending'
                  ? 'Stripe setup in progress'
                  : connect === 'not_configured'
                    ? 'Stripe is not configured'
                    : connect === 'missing_account'
                      ? 'Stripe account missing'
                      : 'Stripe connection status'}
              <StatusPill tone={connect === 'complete' ? 'success' : connect === 'pending' ? 'pending' : 'warning'}>
                {connect === 'complete' ? 'ready' : connect}
              </StatusPill>
            </div>
            <div className="mt-1 text-sm text-muted">
              {connect === 'complete'
                ? 'Payout setup is complete. You can receive payments.'
                : connect === 'pending'
                  ? 'Finish the Stripe steps to enable payouts.'
                  : connect === 'not_configured'
                    ? 'Set STRIPE_SECRET_KEY and enable Connect in Stripe.'
                    : connect === 'missing_account'
                      ? 'Something went wrong. Try connecting again.'
                      : connect === 'error' && connectMsg
                        ? connectMsg
                        : connect === 'error'
                          ? 'Something went wrong. Try connecting again.'
                          : 'If this looks wrong, try connecting again.'}
            </div>
          </div>
        ) : null}

        <Card className="mb-6 shadow-[var(--shadow-md)]" padding="lg">
          <p className="text-base font-semibold text-primary">This week</p>
          {loading ? (
            <p className="mt-3 text-sm text-muted">Loading…</p>
          ) : (
            <div className="mt-3 space-y-2">
              <PriceRow label="Earnings" value={formatMoney(thisWeekEarnings)} emphasize />
              <PriceRow label="Jobs" value={String(thisWeekJobs)} />
              <PriceRow label="Avg per job" value={formatMoney(avgPerJob)} />
            </div>
          )}
          <p className="mt-3 text-sm text-muted">
            Flyers Up brought you {thisWeekJobs} customer{thisWeekJobs === 1 ? '' : 's'} this week
          </p>
          <p className="mt-1 text-xs font-medium text-primary">
            Totals here reflect what you earn from completed jobs. Customers pay marketplace fees on top of your rate.
          </p>
        </Card>

        {/* Summary */}
        <div className="grid grid-cols-1 gap-4 mb-6 sm:grid-cols-2">
          <Card withRail>
            <div className="py-6 text-center">
              {loading ? <div className="text-muted">Loading…</div> : (
                <>
                  <div className="mb-1 text-3xl font-bold text-text">
                    {summary ? formatMoney(summary.thisMonth) : '$0'}
                  </div>
                  <div className="text-sm text-muted">This Month</div>
                </>
              )}
            </div>
          </Card>
          <Card withRail>
            <div className="text-center py-6">
              {loading ? (
                <div className="text-muted">Loading…</div>
              ) : (
                <>
                  <div className="text-3xl font-bold text-text mb-1">
                    {summary ? formatMoney(summary.totalEarnings) : '$0'}
                  </div>
                  <div className="text-sm text-muted">All Time</div>
                </>
              )}
            </div>
          </Card>
        </div>
        <Card withRail className="mb-6">
          <div className="py-6 px-4">
            {loading ? (
              <div className="text-muted">Loading…</div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
                <div>
                  <div className="text-2xl font-bold text-text">{summary ? formatMoney(summary.totalEarnings) : '$0'}</div>
                  <div className="text-xs text-muted">Total Earned</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-text">{summary?.completedJobs ?? 0}</div>
                  <div className="text-xs text-muted">Completed Jobs</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-text">{summary?.avgRating != null ? summary.avgRating.toFixed(1) : '—'}</div>
                  <div className="text-xs text-muted">Avg Rating</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-text">{summary && summary.pendingPayments > 0 ? formatMoney(summary.pendingPayments) : '$0'}</div>
                  <div className="text-xs text-muted">Pending</div>
                </div>
              </div>
            )}
          </div>
        </Card>

        {/* Recent Earnings */}
        <div className="mb-6">
          <Label className="mb-4 block">Recent earnings</Label>
          {loading ? (
            <p className="text-sm text-muted/70">Loading…</p>
          ) : recent.length === 0 ? (
            <Card>
              <div className="py-4 text-center text-sm text-muted">
                No earnings yet. Jobs near you are waiting.
              </div>
            </Card>
          ) : (
            <div className="space-y-4">
              {recent.map((e) => (
                <Card key={e.id}>
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-semibold text-text">{formatDate(e.createdAt)}</div>
                      <div className="text-sm text-muted">Paid</div>
                    </div>
                    <div className="text-xl font-bold text-accent">{formatMoney(e.amount)}</div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Connect Stripe */}
        <Button
          variant="secondary"
          className="w-full"
          type="button"
          onClick={() => {
            window.location.href = '/pro/connect';
          }}
          showArrow={false}
        >
          Connect with Stripe
        </Button>
        </div>
      </ProPageShell>
    </AppLayout>
  );
}












