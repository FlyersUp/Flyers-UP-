'use client';

/**
 * Compact horizontal steps for customer booking detail (mobile-first).
 * Same semantics as BookingProgressTracker; visual tuned to match customer mockups.
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

export interface BookingStepTrackerProps {
  status: string;
  paidAt?: string | null;
  paidDepositAt?: string | null;
  fullyPaidAt?: string | null;
  className?: string;
}

export function BookingStepTracker({
  status,
  paidAt,
  paidDepositAt,
  fullyPaidAt,
  className,
}: BookingStepTrackerProps) {
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
        'rounded-2xl border border-black/[0.06] dark:border-white/[0.08] bg-white dark:bg-[#171A20] px-2.5 py-3.5 shadow-[0_1px_3px_rgba(0,0,0,0.06)]',
        className
      )}
    >
      <div className="flex items-start justify-between min-w-0">
        {STEPS.map((step, idx) => {
          const postKey = current as PostRequestKey;
          const isDone =
            effectiveIdx >= 0 &&
            (idx < effectiveIdx || (idx === effectiveIdx && ['COMPLETED', 'PAID'].includes(postKey)));
          const isActive = effectiveIdx >= 0 && idx === effectiveIdx && !isDone;
          const isLast = idx === STEPS.length - 1;

          return (
            <div key={step.key} className="flex flex-1 items-start min-w-0">
              <div className="flex flex-col items-center flex-1 min-w-0 max-w-full">
                <div
                  className={cn(
                    'flex items-center justify-center rounded-full h-8 w-8 shrink-0 transition-all duration-200',
                    isDone && 'bg-[#4A69BD] text-white shadow-sm',
                    isActive && 'bg-[#4A69BD] text-white ring-4 ring-[#4A69BD]/25',
                    !isDone && !isActive && 'bg-[#E8EAEF] dark:bg-white/10 text-transparent border border-[#D1D5DB]/80 dark:border-white/10'
                  )}
                  aria-current={isActive ? 'step' : undefined}
                >
                  {isDone ? (
                    <Check className="w-4 h-4" strokeWidth={2.5} />
                  ) : isActive ? (
                    <span className="h-2 w-2 rounded-full bg-white" aria-hidden />
                  ) : (
                    <span className="h-2 w-2 rounded-full bg-[#C5CAD3] dark:bg-white/25" aria-hidden />
                  )}
                </div>
                <span
                  className={cn(
                    'mt-1.5 text-[10px] sm:text-[11px] font-medium text-center leading-tight px-0.5 line-clamp-2',
                    isDone && 'text-[#4A69BD] dark:text-[#7BA3E8]',
                    isActive && 'text-[#111111] dark:text-[#F5F7FA] font-semibold',
                    !isDone && !isActive && 'text-[#9CA3AF] dark:text-white/35'
                  )}
                >
                  {step.label}
                </span>
              </div>
              {!isLast && (
                <div
                  className={cn(
                    'flex-1 h-0.5 mt-4 mx-0.5 min-w-[2px] rounded-full',
                    idx < effectiveIdx ? 'bg-[#4A69BD]/45' : 'bg-[#E5E7EB] dark:bg-white/10'
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
