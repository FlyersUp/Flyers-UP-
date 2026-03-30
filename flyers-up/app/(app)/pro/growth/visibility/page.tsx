'use client';

import Link from 'next/link';
import { Check, Circle } from 'lucide-react';
import { GrowthPageShell, growthActionLinkClass } from '@/components/pro/GrowthPageShell';
import { Card } from '@/components/ui/Card';
import { useProGrowthMenu } from '@/hooks/useProGrowthMenu';

export default function ProGrowthVisibilityPage() {
  const { data, error, loading } = useProGrowthMenu();
  const strength = data?.profileStrength;

  return (
    <GrowthPageShell title="Improve visibility">
      {loading && (
        <Card className="animate-pulse">
          <div className="h-32 bg-surface2 rounded-xl" />
        </Card>
      )}
      {error && (
        <Card>
          <p className="text-text2 text-sm">Couldn&apos;t load profile strength. Try again in a moment.</p>
        </Card>
      )}
      {strength && (
        <>
          <Card padding="lg" className="mb-6">
            <p className="text-sm text-text2 uppercase tracking-wide font-semibold">Profile strength</p>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-4xl font-bold text-text tabular-nums">{strength.score}</span>
              <span className="text-text2">/ {strength.maxScore}</span>
            </div>
            <p className="mt-3 text-sm text-text2 leading-relaxed">
              A stronger profile improves how you rank in search and how confident customers feel booking you. Complete
              the checklist below to raise your score.
            </p>
            <div className="mt-4 h-3 w-full rounded-full bg-border overflow-hidden">
              <div
                className="h-full rounded-full bg-[hsl(var(--accent-pro)/0.9)]"
                style={{ width: `${strength.score}%` }}
              />
            </div>
          </Card>
          <Card padding="lg" className="space-y-0 divide-y divide-border">
            {strength.items.map((item) => (
              <div key={item.id} className="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
                <span className="mt-0.5 flex-shrink-0 text-text2" aria-hidden>
                  {item.done ? (
                    <Check size={20} className="text-[hsl(var(--accent-pro))]" />
                  ) : (
                    <Circle size={20} className="opacity-40" />
                  )}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex justify-between gap-2">
                    <span className="text-sm font-medium text-text">{item.label}</span>
                    <span className="text-xs text-text2 tabular-nums">
                      {item.pointsEarned}/{item.pointsMax}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </Card>
          <div className="mt-6 flex flex-col sm:flex-row flex-wrap gap-3">
            <Link href="/pro/profile" className={growthActionLinkClass}>
              Edit profile
            </Link>
            <Link href="/pro/settings/business-profile" className={growthActionLinkClass}>
              Business &amp; service area
            </Link>
            <Link href="/pro/settings/pricing-availability" className={growthActionLinkClass}>
              Pricing &amp; availability
            </Link>
            <Link href="/pro/settings/payments-payouts" className={growthActionLinkClass}>
              Payouts
            </Link>
          </div>
        </>
      )}
    </GrowthPageShell>
  );
}
