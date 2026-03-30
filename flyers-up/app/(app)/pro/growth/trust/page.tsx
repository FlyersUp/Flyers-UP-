'use client';

import Link from 'next/link';
import { GrowthPageShell, growthActionLinkClass } from '@/components/pro/GrowthPageShell';
import { Card } from '@/components/ui/Card';
import { useProGrowthMenu } from '@/hooks/useProGrowthMenu';

export default function ProGrowthTrustPage() {
  const { data, error, loading } = useProGrowthMenu();
  const row = data?.items.find((i) => i.id === 'trust');
  const rel = row?.meta?.reliabilityScore;
  const payoutsReady = row?.meta?.payoutsReady === true;
  const openDisputes = row?.meta?.openDisputesCount ?? 0;

  const reliabilityLabel =
    typeof rel === 'number' ? `${Math.round(rel)} / 100` : 'Not enough data yet — keep completing jobs on time.';

  return (
    <GrowthPageShell title="Trust & standing">
      {loading && (
        <Card className="animate-pulse">
          <div className="h-36 bg-surface2 rounded-xl" />
        </Card>
      )}
      {error && (
        <Card>
          <p className="text-text2 text-sm">Couldn&apos;t load trust summary.</p>
        </Card>
      )}
      {data && (
        <Card padding="lg" className="space-y-5">
          <div className="space-y-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-text2">Reliability</p>
              <p className="mt-1 text-lg font-semibold text-text">{reliabilityLabel}</p>
              <p className="mt-1 text-sm text-text2">
                Based on platform signals such as confirmations and completion behavior. It updates as you operate on
                the marketplace.
              </p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-text2">Payouts</p>
              <p className="mt-1 text-sm text-text">
                {payoutsReady
                  ? 'Stripe is connected and charges are enabled — you can receive payouts for completed work.'
                  : 'Finish Stripe onboarding under Payments & payouts so earnings can be released without delays.'}
              </p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-text2">Disputes</p>
              <p className="mt-1 text-sm text-text">
                {openDisputes === 0
                  ? 'No open disputes — keep documenting scope and delivery in-app.'
                  : `${openDisputes} open dispute${openDisputes === 1 ? '' : 's'} — respond promptly with requested evidence.`}
              </p>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row flex-wrap gap-3 pt-2 border-t border-border">
            <Link href="/pro/verified-badge" className={growthActionLinkClass}>
              Verification &amp; badge
            </Link>
            <Link href="/pro/settings/payments-payouts" className={growthActionLinkClass}>
              Payments &amp; payouts
            </Link>
            <Link href="/pro/growth/disputes" className={growthActionLinkClass}>
              Dispute summary
            </Link>
          </div>
        </Card>
      )}
    </GrowthPageShell>
  );
}
