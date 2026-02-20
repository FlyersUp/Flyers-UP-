'use client';

import { useState, useEffect } from 'react';
import { AppLayout } from '@/components/layouts/AppLayout';
import { Label } from '@/components/ui/Label';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { getProEarnings, getRecentProEarnings, type RecentEarning } from '@/lib/api';
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
  const [summary, setSummary] = useState<{ totalEarnings: number; thisMonth: number; completedJobs: number; pendingPayments: number } | null>(null);
  const [recent, setRecent] = useState<RecentEarning[]>([]);
  const [loading, setLoading] = useState(true);

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
      <div className="max-w-4xl mx-auto px-4 py-6">
        <h1 className="text-2xl font-semibold text-text mb-6">
          Earnings
        </h1>

        {connect ? (
          <div className="mb-4 rounded-[18px] border border-hairline bg-surface shadow-card px-5 py-4">
            <div className="text-sm font-semibold tracking-tight text-text">
              {connect === 'complete'
                ? 'Stripe connected'
                : connect === 'pending'
                  ? 'Stripe setup in progress'
                  : connect === 'not_configured'
                    ? 'Stripe is not configured'
                    : connect === 'missing_account'
                      ? 'Stripe account missing'
                      : 'Stripe connection status'}
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
                      : 'If this looks wrong, try connecting again.'}
            </div>
          </div>
        ) : null}

        {/* Summary */}
        <Card withRail className="mb-6">
          <div className="text-center py-6">
            {loading ? (
              <div className="text-muted">Loading…</div>
            ) : (
              <>
                <div className="text-4xl font-bold text-text mb-2">
                  {summary ? formatMoney(summary.thisMonth) : '$0'}
                </div>
                <div className="text-muted mb-4">Total Earnings (This Month)</div>
                <div className="text-sm text-muted/70 space-y-1">
                  {summary && summary.pendingPayments > 0 && (
                    <div>Pending (awaiting customer payment): <span className="font-semibold text-text">{formatMoney(summary.pendingPayments)}</span></div>
                  )}
                  <div>Total earned (all time): <span className="font-semibold text-accent">{summary ? formatMoney(summary.totalEarnings) : '$0'}</span></div>
                </div>
              </>
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
                No earnings yet. Completed jobs with paid invoices will appear here.
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
            window.location.href = '/api/stripe/connect/onboard';
          }}
          showArrow={false}
        >
          Connect with Stripe
        </Button>
      </div>
    </AppLayout>
  );
}












