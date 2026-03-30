'use client';

import Link from 'next/link';
import { GrowthPageShell, growthActionLinkClass } from '@/components/pro/GrowthPageShell';
import { Card } from '@/components/ui/Card';
import { useProGrowthMenu } from '@/hooks/useProGrowthMenu';

export default function ProGrowthInsightsPage() {
  const { data, error, loading } = useProGrowthMenu();
  const ins = data?.insights;

  return (
    <GrowthPageShell title="Insights">
      {loading && (
        <Card className="animate-pulse">
          <div className="h-24 bg-surface2 rounded-xl" />
        </Card>
      )}
      {error && (
        <Card>
          <p className="text-text2 text-sm">We couldn&apos;t load your progress. Pull to refresh or try again later.</p>
        </Card>
      )}
      {data && ins && !ins.unlocked && (
        <Card padding="lg" className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold text-text">Unlock performance insights</h2>
            <p className="mt-2 text-sm text-text2 leading-relaxed">
              After you unlock, you&apos;ll see how response time, job acceptance, and earnings trend over time so you
              can tune your business on the platform.
            </p>
          </div>
          <div className="rounded-xl border border-border bg-surface2/50 p-4">
            <p className="text-sm font-medium text-text mb-1">What unlocks this</p>
            <ul className="text-sm text-text2 space-y-1 list-disc list-inside">
              <li>Complete 1 paid job (paid, completed, or awaiting review), or</li>
              <li>Reach 3 total bookings on your account (all statuses count)</li>
            </ul>
          </div>
          <div>
            <p className="text-sm text-text mb-2">
              <span className="font-medium text-text">
                {Math.min(ins.totalJobsCount, ins.unlockRequiresTotalBookings)}
              </span>
              {' of '}
              {ins.unlockRequiresTotalBookings} total bookings toward the 3-booking path
            </p>
            <div className="h-2 w-full max-w-sm rounded-full bg-border overflow-hidden">
              <div
                className="h-full rounded-full bg-[hsl(var(--accent-pro)/0.9)]"
                style={{
                  width: `${Math.min(
                    100,
                    Math.round((ins.totalJobsCount / ins.unlockRequiresTotalBookings) * 100)
                  )}%`,
                }}
              />
            </div>
            <p className="mt-2 text-xs text-text2">
              Paid completions so far:{' '}
              <span className="font-medium text-text">{ins.completedJobsCount}</span>
              . Completing one paid job unlocks insights immediately.
            </p>
          </div>
          <Link href="/pro/jobs" className={`${growthActionLinkClass} w-full sm:w-auto`}>
            View jobs
          </Link>
        </Card>
      )}
      {data && ins && ins.unlocked && (
        <Card padding="lg" className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold text-text">Performance tracking</h2>
            <p className="mt-2 text-sm text-text2 leading-relaxed">
              You&apos;re tracking response time, acceptance patterns, and earnings context. Detailed charts and
              benchmarks will sharpen as you complete more jobs on the platform.
            </p>
          </div>
          <div className="rounded-xl border border-border bg-surface2/40 p-4 text-sm text-text2">
            <p>
              Completed jobs: <span className="font-medium text-text">{ins.completedJobsCount}</span>
            </p>
            <p className="mt-1">
              Total bookings (all statuses): <span className="font-medium text-text">{ins.totalJobsCount}</span>
            </p>
            <p className="mt-1">
              Active pipeline (excl. cancelled / declined):{' '}
              <span className="font-medium text-text">{ins.engagedJobsCount}</span>
            </p>
          </div>
          <Link href="/pro/earnings" className={`${growthActionLinkClass} w-full sm:w-auto`}>
            Earnings
          </Link>
        </Card>
      )}
    </GrowthPageShell>
  );
}
