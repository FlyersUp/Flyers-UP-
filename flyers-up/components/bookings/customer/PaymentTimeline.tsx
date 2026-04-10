'use client';

import { Fragment } from 'react';
import type { PaymentTimelineStepStatus } from '@/lib/bookings/payment-timeline';

export type { PaymentTimelineStepStatus } from '@/lib/bookings/payment-timeline';

export type PaymentTimelineProps = {
  deposit: PaymentTimelineStepStatus;
  completed: PaymentTimelineStepStatus;
  autoCharge: PaymentTimelineStepStatus;
  paid: PaymentTimelineStepStatus;
  compact?: boolean;
  className?: string;
};

const LABELS = {
  deposit: 'Deposit',
  completed: 'Completed',
  autoCharge: 'Auto-charge',
  paid: 'Paid',
} as const;

function Dot({ status }: { status: PaymentTimelineStepStatus }) {
  const base =
    'shrink-0 flex h-2.5 w-2.5 sm:h-3 sm:w-3 rounded-full items-center justify-center ring-2 ring-offset-2 ring-offset-white dark:ring-offset-[#171A20]';
  switch (status) {
    case 'complete':
      return <span className={`${base} bg-emerald-500 ring-emerald-500/35`} aria-hidden />;
    case 'current':
    case 'processing':
      return (
        <span
          className={`${base} bg-[#4A69BD] ring-[#4A69BD]/40 ${status === 'processing' ? 'animate-pulse' : ''}`}
          aria-hidden
        />
      );
    case 'failed':
      return <span className={`${base} bg-amber-500 ring-amber-500/40`} aria-hidden />;
    default:
      return <span className={`${base} bg-[#E5E7EB] dark:bg-white/20 ring-transparent`} aria-hidden />;
  }
}

function barAfterStep(step: PaymentTimelineStepStatus): 'done' | 'failed' | 'idle' {
  if (step === 'complete') return 'done';
  if (step === 'failed') return 'failed';
  return 'idle';
}

export function PaymentTimeline({
  deposit,
  completed,
  autoCharge,
  paid,
  compact = false,
  className = '',
}: PaymentTimelineProps) {
  const steps: { key: keyof typeof LABELS; status: PaymentTimelineStepStatus }[] = [
    { key: 'deposit', status: deposit },
    { key: 'completed', status: completed },
    { key: 'autoCharge', status: autoCharge },
    { key: 'paid', status: paid },
  ];

  const gap = compact ? 'gap-2' : 'gap-3';

  const bar = (tone: 'done' | 'failed' | 'idle') =>
    tone === 'done'
      ? 'bg-emerald-500/45'
      : tone === 'failed'
        ? 'bg-amber-400/60 dark:bg-amber-600/50'
        : 'bg-[#E5E7EB] dark:bg-white/15';

  return (
    <div className={className} role="list" aria-label="Payment progress">
      {/* Mobile: vertical */}
      <div className={`flex flex-col ${gap} md:hidden`}>
        {steps.map((s, i) => {
          const isLast = i === steps.length - 1;
          return (
            <div key={s.key} className="flex gap-3 min-w-0" role="listitem">
              <div className="flex flex-col items-center pt-0.5">
                <Dot status={s.status} />
                {!isLast && (
                  <span
                    className={`w-0.5 flex-1 min-h-[12px] mt-1 ${bar(barAfterStep(s.status))}`}
                    aria-hidden
                  />
                )}
              </div>
              <div className="min-w-0 pb-0.5">
                <p
                  className={`text-xs font-medium leading-tight ${
                    s.status === 'upcoming'
                      ? 'text-[#9CA3AF] dark:text-white/40'
                      : s.status === 'failed'
                        ? 'text-amber-900 dark:text-amber-100'
                        : 'text-[#111111] dark:text-[#F5F7FA]'
                  }`}
                >
                  {LABELS[s.key]}
                </p>
                {s.status === 'processing' && (
                  <p className="text-[10px] text-[#6A6A6A] dark:text-[#A1A8B3] mt-0.5">Processing</p>
                )}
                {s.status === 'failed' && s.key === 'autoCharge' && (
                  <p className="text-[10px] text-amber-800/90 dark:text-amber-200/80 mt-0.5">Failed</p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Desktop: horizontal stepper */}
      <div className="hidden md:flex w-full min-w-0 items-start justify-between gap-0">
        {steps.map((s, i) => (
          <Fragment key={s.key}>
            {i > 0 && (
              <div
                className={`flex-1 min-w-[8px] h-0.5 mt-[5px] mx-1 rounded-full ${bar(barAfterStep(steps[i - 1].status))}`}
                aria-hidden
              />
            )}
            <div className="flex flex-col items-center w-[4.5rem] shrink-0 max-w-[25%]" role="listitem">
              <Dot status={s.status} />
              <p
                className={`mt-1.5 text-center text-[10px] font-medium leading-snug hyphens-none ${
                  s.status === 'upcoming'
                    ? 'text-[#9CA3AF] dark:text-white/40'
                    : s.status === 'failed'
                      ? 'text-amber-900 dark:text-amber-100'
                      : 'text-[#111111] dark:text-[#F5F7FA]'
                }`}
              >
                {LABELS[s.key]}
              </p>
            </div>
          </Fragment>
        ))}
      </div>
    </div>
  );
}
