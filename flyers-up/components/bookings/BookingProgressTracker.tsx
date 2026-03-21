'use client';

/**
 * Horizontal progress tracker for booking screens.
 * [Accepted] → [On the way] → [In progress] → [Completed] → [Paid]
 * Green for completed, neutral for upcoming, highlighted for current.
 */

import { deriveTimelineDisplayStatus } from '@/components/jobs/jobStatus';
import { Check } from 'lucide-react';
import { cn } from '@/lib/cn';

const STEPS = [
  { key: 'ACCEPTED', label: 'Accepted' },
  { key: 'ON_THE_WAY', label: 'On the way' },
  { key: 'IN_PROGRESS', label: 'In progress' },
  { key: 'COMPLETED', label: 'Completed' },
  { key: 'PAID', label: 'Paid' },
] as const;

type PostRequestKey = (typeof STEPS)[number]['key'];

export interface BookingProgressTrackerProps {
  status: string;
  paidAt?: string | null;
  paidDepositAt?: string | null;
  fullyPaidAt?: string | null;
  className?: string;
}

export function BookingProgressTracker({
  status,
  paidAt,
  paidDepositAt,
  fullyPaidAt,
  className,
}: BookingProgressTrackerProps) {
  const current = deriveTimelineDisplayStatus(status, { paidAt, paidDepositAt, fullyPaidAt });
  const preAccept = current === 'BOOKED' || current === 'AWAITING_ACCEPTANCE';
  const postIdx = STEPS.findIndex((s) => s.key === current);
  const effectiveIdx = preAccept
    ? -1
    : postIdx >= 0
      ? Math.min(postIdx, STEPS.length - 1)
      : 0;

  return (
    <nav
      aria-label="Booking progress"
      className={cn(
        'rounded-2xl border border-border bg-[hsl(var(--card-neutral))] px-4 py-4 shadow-[var(--shadow-card)]',
        className
      )}
    >
      <div className="flex items-center justify-between">
        {STEPS.map((step, idx) => {
          const postKey = current as PostRequestKey;
          const isDone =
            effectiveIdx >= 0 &&
            (idx < effectiveIdx || (idx === effectiveIdx && ['COMPLETED', 'PAID'].includes(postKey)));
          const isActive = effectiveIdx >= 0 && idx === effectiveIdx && !isDone;
          const isLast = idx === STEPS.length - 1;
          return (
            <div key={step.key} className="flex flex-1 items-center min-w-0">
              <div className="flex flex-col items-center flex-1">
                <div
                  className={cn(
                    'flex items-center justify-center rounded-full h-9 w-9 shrink-0 text-sm font-semibold transition-all duration-200',
                    isDone &&
                      'bg-[hsl(var(--accent-customer)/0.25)] text-[hsl(var(--accent-customer))] border border-[hsl(var(--accent-customer)/0.5)]',
                    isActive &&
                      'bg-[hsl(var(--accent-pro))] text-[hsl(var(--accent-contrast))] border border-[hsl(var(--accent-pro)/0.7)] shadow-md',
                    !isDone &&
                      !isActive &&
                      'bg-surface2 border border-border text-muted'
                  )}
                  aria-current={isActive ? 'step' : undefined}
                >
                  {isDone ? <Check className="w-4 h-4" strokeWidth={2.5} /> : idx + 1}
                </div>
                <span
                  className={cn(
                    'mt-1.5 text-[11px] font-medium text-center truncate max-w-[3.5rem]',
                    isDone && 'text-[hsl(var(--accent-customer))]',
                    isActive && 'text-foreground',
                    !isDone && !isActive && 'text-muted'
                  )}
                >
                  {step.label}
                </span>
              </div>
              {!isLast && (
                <div
                  className={cn(
                    'flex-1 h-0.5 mx-1 -mt-6',
                    idx < effectiveIdx ? 'bg-[hsl(var(--accent-customer)/0.4)]' : 'bg-border'
                  )}
                  aria-hidden
                />
              )}
            </div>
          );
        })}
      </div>
    </nav>
  );
}
