'use client';

import type {
  ProPayoutHoldUiKey,
  ProPayoutNotReadyReason,
  ProSimplePayoutUiState,
} from '@/lib/bookings/pro-simple-payout-ui';
import { mapProPayoutHoldDescription, mapProPayoutNotReadyDescription } from '@/lib/bookings/pro-simple-payout-ui';
import { cn } from '@/lib/cn';

export type ProPayoutStatusCardProps = {
  state: ProSimplePayoutUiState;
  holdUiKey?: ProPayoutHoldUiKey | null;
  /** When `state === 'not_ready'`, explains why without using “on hold” language. */
  notReadyReason?: ProPayoutNotReadyReason | null;
  className?: string;
};

function notReadyTitle(reason: ProPayoutNotReadyReason | null | undefined): string {
  switch (reason) {
    case 'booking_not_completed':
      return 'Payout not ready yet';
    case 'pro_not_ready_for_payout':
      return 'Finish payout setup';
    case 'generic':
      return 'Quick check';
    case 'final_payment_pending':
    default:
      return 'Final payment pending';
  }
}

const CONFIG: Record<
  Exclude<ProSimplePayoutUiState, 'not_ready'>,
  { title: string; description: (hold?: ProPayoutHoldUiKey | null) => string; tone: 'neutral' | 'info' | 'success' | 'warning' | 'danger' }
> = {
  ready: {
    title: 'Ready for payout',
    description: () => 'Your payout is about to start.',
    tone: 'info',
  },
  processing: {
    title: 'Payout on the way',
    description: () =>
      'Stripe has started your transfer. It can show as pending or in transit for a little while before your bank posts it.',
    tone: 'info',
  },
  paid: {
    title: 'Paid out',
    description: () =>
      'Stripe marks this transfer paid — funds should appear in your bank on the usual settlement schedule.',
    tone: 'success',
  },
  held: {
    title: 'Payout on hold',
    description: (hold) => mapProPayoutHoldDescription(hold ?? 'generic'),
    tone: 'warning',
  },
  failed: {
    title: 'Payout issue',
    description: () =>
      'The transfer did not complete. We retry automatically on a schedule, or fix your Connect / payout setup — check notifications or contact support if this lasts more than a business day.',
    tone: 'danger',
  },
};

type CardTone =
  | 'neutral'
  | 'info'
  | 'success'
  | 'warning'
  | 'danger';

function toneBorder(tone: CardTone): string {
  switch (tone) {
    case 'success':
      return 'border-emerald-200/90 dark:border-emerald-900/50';
    case 'warning':
      return 'border-amber-200/90 dark:border-amber-900/50';
    case 'danger':
      return 'border-red-200/90 dark:border-red-900/50';
    case 'info':
      return 'border-[hsl(var(--accent-customer)/0.35)]';
    default:
      return 'border-[var(--hairline)]';
  }
}

function toneBg(tone: CardTone): string {
  switch (tone) {
    case 'success':
      return 'bg-emerald-50/80 dark:bg-emerald-950/25';
    case 'warning':
      return 'bg-amber-50/80 dark:bg-amber-950/25';
    case 'danger':
      return 'bg-red-50/80 dark:bg-red-950/25';
    case 'info':
      return 'bg-[hsl(var(--accent-customer)/0.08)]';
    default:
      return 'bg-surface';
  }
}

/**
 * Single “when do I get paid?” card for pros — only six states, no raw lifecycle or DB codes.
 */
export function ProPayoutStatusCard({
  state,
  holdUiKey,
  notReadyReason,
  className,
}: ProPayoutStatusCardProps) {
  const title =
    state === 'not_ready' ? notReadyTitle(notReadyReason) : CONFIG[state].title;
  const desc =
    state === 'held'
      ? CONFIG.held.description(holdUiKey ?? null)
      : state === 'not_ready'
        ? mapProPayoutNotReadyDescription(notReadyReason)
        : CONFIG[state].description();
  const tone: CardTone =
    state === 'not_ready' ? 'neutral' : CONFIG[state].tone;

  return (
    <div
      className={cn(
        'rounded-2xl border p-4 shadow-[var(--shadow-card)]',
        toneBorder(tone),
        toneBg(tone),
        className
      )}
    >
      <p className="text-xs font-semibold uppercase tracking-wide text-muted">When you get paid</p>
      <p className="mt-2 text-base font-semibold text-text">{title}</p>
      <p className="mt-1 text-sm text-muted leading-relaxed">{desc}</p>
    </div>
  );
}
