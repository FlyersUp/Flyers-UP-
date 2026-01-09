'use client';

import { AppLayout } from '@/components/layouts/AppLayout';
import { Label } from '@/components/ui/Label';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

/**
 * Earnings / Payouts - Screen 15
 * Earnings summary and payout history
 */
export default function Earnings() {
  return (
    <AppLayout mode="pro">
      <div className="max-w-4xl mx-auto px-4 py-6">
        <h1 className="text-2xl font-semibold text-gray-900 mb-6">
          Earnings
        </h1>

        {/* Summary */}
        <Card withRail className="mb-6">
          <div className="text-center py-6">
            <div className="text-4xl font-bold text-gray-900 mb-2">$2,450</div>
            <div className="text-gray-600 mb-4">Total Earnings (This Month)</div>
            <div className="text-sm text-gray-500">
              Available for payout: <span className="font-semibold text-[#FFD3A1]">$1,200</span>
            </div>
          </div>
        </Card>

        {/* Recent Payouts */}
        <div className="mb-6">
          <Label className="mb-4 block">RECENT PAYOUTS</Label>
          <div className="space-y-3">
            {[
              { date: 'Jan 10, 2024', amount: 450, status: 'Completed' },
              { date: 'Jan 5, 2024', amount: 380, status: 'Completed' },
              { date: 'Dec 30, 2023', amount: 520, status: 'Completed' },
            ].map((payout, i) => (
              <Card key={i}>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-gray-900">{payout.date}</div>
                    <div className="text-sm text-gray-600">{payout.status}</div>
                  </div>
                  <div className="text-xl font-bold text-[#FFD3A1]">${payout.amount}</div>
                </div>
              </Card>
            ))}
          </div>
        </div>

        {/* Connect Stripe */}
        <Button variant="secondary" className="w-full">
          CONNECT WITH STRIPE →
        </Button>
      </div>
    </AppLayout>
  );
}












