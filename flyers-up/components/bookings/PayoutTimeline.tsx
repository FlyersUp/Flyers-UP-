'use client';

/**
 * Payout timeline: Completed → Payment released → Processing → Paid.
 * Pass {@link activeStepIndex} from {@link getProPayoutTimelineActiveIndex} — no payout string logic here.
 */

import { Check } from 'lucide-react';
import { cn } from '@/lib/cn';

const STAGES = [
  { key: 'completed', label: 'Completed' },
  { key: 'released', label: 'Payment released' },
  { key: 'processing', label: 'Processing' },
  { key: 'paid', label: 'Paid' },
] as const;

export interface PayoutTimelineProps {
  /**
   * Active step 0–3 from {@link getProPayoutTimelineActiveIndex}.
   * When set, `payoutStatus` / `customerPaid` are ignored.
   */
  activeStepIndex?: 0 | 1 | 2 | 3;
  /** Transfer failed in Stripe — same messaging as before. */
  transferFailed?: boolean;
  /** @deprecated Prefer `activeStepIndex` from money state. */
  payoutStatus?: string | null;
  /** @deprecated Prefer `activeStepIndex` from money state. */
  customerPaid?: boolean;
  className?: string;
}

export function PayoutTimeline({
  activeStepIndex: activeStepIndexProp,
  transferFailed = false,
  payoutStatus,
  customerPaid = false,
  className,
}: PayoutTimelineProps) {
  const stageIdx = (() => {
    if (activeStepIndexProp !== undefined) return activeStepIndexProp;
    const status = (payoutStatus ?? 'none').toLowerCase();
    let idx = 0;
    if (customerPaid) idx = 1;
    if (status === 'pending' || status === 'in_transit') idx = 2;
    if (status === 'failed') idx = 2;
    if (status === 'succeeded' || status === 'paid') idx = 3;
    return idx as 0 | 1 | 2 | 3;
  })();

  return (
    <div
      className={cn(
        'rounded-2xl border border-border bg-[hsl(var(--card-neutral))] p-4 shadow-[var(--shadow-card)]',
        className
      )}
    >
      <p className="text-xs font-semibold text-muted uppercase tracking-wider mb-3">Payout status</p>
      <div className="flex items-center gap-2">
        {STAGES.map((s, idx) => {
          const isDone = idx <= stageIdx;
          const isActive = idx === stageIdx;
          const isLast = idx === STAGES.length - 1;
          return (
            <div key={s.key} className="flex flex-1 items-center min-w-0">
              <div className="flex flex-col items-center flex-1">
                <div
                  className={cn(
                    'flex items-center justify-center rounded-full h-7 w-7 shrink-0 text-xs font-medium',
                    isDone &&
                      'bg-[hsl(var(--accent-customer)/0.25)] text-[hsl(var(--accent-customer))] border border-[hsl(var(--accent-customer)/0.5)]',
                    isActive &&
                      !isDone &&
                      'bg-surface2 border border-border text-muted animate-pulse',
                    !isDone &&
                      !isActive &&
                      'bg-surface2 border border-border text-muted'
                  )}
                >
                  {isDone ? <Check className="w-3.5 h-3.5" strokeWidth={2.5} /> : idx + 1}
                </div>
                <span
                  className={cn(
                    'mt-1 text-[10px] font-medium text-center truncate max-w-[3rem]',
                    isDone && 'text-[hsl(var(--accent-customer))]',
                    isActive && 'text-foreground',
                    !isDone && !isActive && 'text-muted'
                  )}
                >
                  {s.label}
                </span>
              </div>
              {!isLast && (
                <div
                  className={cn(
                    'flex-1 h-0.5 mx-0.5 -mt-5',
                    idx < stageIdx ? 'bg-[hsl(var(--accent-customer)/0.4)]' : 'bg-border'
                  )}
                  aria-hidden
                />
              )}
            </div>
          );
        })}
      </div>
      {stageIdx === 2 && !transferFailed && (
        <p className="text-xs text-muted mt-3 text-center">Funds are being prepared</p>
      )}
      {transferFailed && (
        <p className="text-xs text-amber-900 dark:text-amber-200 mt-3 text-center">
          Payout transfer did not complete — contact support if this persists
        </p>
      )}
      {activeStepIndexProp === undefined && stageIdx === 1 && !customerPaid && (
        <p className="text-xs text-muted mt-3 text-center">Waiting for customer confirmation</p>
      )}
    </div>
  );
}
