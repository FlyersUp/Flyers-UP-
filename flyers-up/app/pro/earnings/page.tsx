'use client';

import { useState } from 'react';
import { AppLayout } from '@/components/layouts/AppLayout';
import { Label } from '@/components/ui/Label';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

/**
 * Earnings / Payouts - Screen 15
 * Earnings summary and payout history
 */
export default function Earnings() {
  // Avoid useSearchParams() prerender constraints; this is client-only.
  // Read once on mount (lazy init) to satisfy lint rule against setState-in-effect.
  const [connect] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null;
    return new URLSearchParams(window.location.search).get('connect');
  });

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
                    : 'Stripe connection status'}
            </div>
            <div className="mt-1 text-sm text-muted">
              {connect === 'complete'
                ? 'Payout setup is complete.'
                : connect === 'pending'
                  ? 'Finish the Stripe steps to enable payouts.'
                  : connect === 'not_configured'
                    ? 'Set STRIPE_SECRET_KEY and enable Connect in Stripe.'
                    : 'If this looks wrong, try connecting again.'}
            </div>
          </div>
        ) : null}

        {/* Summary */}
        <Card withRail className="mb-6">
          <div className="text-center py-6">
            <div className="text-4xl font-bold text-text mb-2">$2,450</div>
            <div className="text-muted mb-4">Total Earnings (This Month)</div>
            <div className="text-sm text-muted/70">
              Available for payout: <span className="font-semibold text-accent">$1,200</span>
            </div>
          </div>
        </Card>

        {/* Recent Payouts */}
        <div className="mb-6">
          <Label className="mb-4 block">RECENT PAYOUTS</Label>
          <div className="space-y-4">
            {[
              { date: 'Jan 10, 2024', amount: 450, status: 'Completed' },
              { date: 'Jan 5, 2024', amount: 380, status: 'Completed' },
              { date: 'Dec 30, 2023', amount: 520, status: 'Completed' },
            ].map((payout, i) => (
              <Card key={i}>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-text">{payout.date}</div>
                    <div className="text-sm text-muted">{payout.status}</div>
                  </div>
                  <div className="text-xl font-bold text-accent">${payout.amount}</div>
                </div>
              </Card>
            ))}
          </div>
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
          CONNECT WITH STRIPE →
        </Button>
      </div>
    </AppLayout>
  );
}












