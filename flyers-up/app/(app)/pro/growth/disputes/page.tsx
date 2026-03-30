'use client';

import Link from 'next/link';
import { GrowthPageShell, growthActionLinkClass } from '@/components/pro/GrowthPageShell';
import { Card } from '@/components/ui/Card';
import { useProGrowthMenu } from '@/hooks/useProGrowthMenu';

export default function ProGrowthDisputesPage() {
  const { data, error, loading } = useProGrowthMenu();
  const row = data?.items.find((i) => i.id === 'disputes');
  const total = row?.meta?.disputesTotalCount ?? 0;
  const open = row?.meta?.openDisputesCount ?? 0;

  return (
    <GrowthPageShell title="Disputes">
      {loading && (
        <Card className="animate-pulse">
          <div className="h-28 bg-surface2 rounded-xl" />
        </Card>
      )}
      {error && (
        <Card>
          <p className="text-text2 text-sm">Couldn&apos;t load dispute summary.</p>
        </Card>
      )}
      {data && total === 0 && (
        <Card padding="lg" className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold text-text">No disputes on record</h2>
            <p className="mt-2 text-sm text-text2 leading-relaxed">
              Disputes and chargebacks hurt cash flow and trust. You can reduce risk with clear scope, photos, and
              in-app messages that document what was agreed and delivered.
            </p>
          </div>
          <ul className="text-sm text-text2 space-y-2 list-disc list-inside">
            <li>Describe what&apos;s included before you accept a job.</li>
            <li>Use chat for changes to price or timing — avoid side deals off-platform.</li>
            <li>Keep payout and tax details current so released funds aren&apos;t delayed.</li>
          </ul>
          <Link href="/booking-rules" className={`${growthActionLinkClass} w-full sm:w-auto`}>
            Read booking rules
          </Link>
        </Card>
      )}
      {data && total > 0 && (
        <Card padding="lg" className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold text-text">Dispute activity</h2>
            <p className="mt-2 text-sm text-text2">
              Total on record: <span className="font-medium text-text">{total}</span>
            </p>
            <p className="mt-1 text-sm text-text2">
              Open now: <span className="font-medium text-text">{open}</span>
            </p>
            <p className="mt-3 text-sm text-text2 leading-relaxed">
              Respond quickly in support threads and provide evidence (messages, photos, receipts) requested by the
              platform.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row flex-wrap gap-3">
            <Link href="/pro/settings/support-legal" className={growthActionLinkClass}>
              Policies &amp; legal
            </Link>
            <Link href="/pro/settings/help-support" className={growthActionLinkClass}>
              Contact support
            </Link>
          </div>
        </Card>
      )}
    </GrowthPageShell>
  );
}
