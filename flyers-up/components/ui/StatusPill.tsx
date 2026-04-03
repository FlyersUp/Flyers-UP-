'use client';

import { cn } from '@/lib/cn';

/** Operational workflow states — booking, payouts, reviews */
export type StatusPillVariant =
  | 'requested'
  | 'accepted'
  | 'pending'
  | 'awaiting-payment'
  | 'in-progress'
  | 'completed'
  | 'verified'
  | 'paused'
  | 'cancelled'
  | 'failed'
  | 'disputed'
  | 'needs-action';

const VARIANT_CLASSES: Record<StatusPillVariant, string> = {
  requested:
    'border-border bg-surface2 text-text2',
  accepted:
    'border-trust/35 bg-trust/12 text-text',
  pending:
    'border-border bg-badgeFill text-muted',
  'awaiting-payment':
    'border-[hsl(var(--action)/0.45)] bg-[hsl(var(--action)/0.14)] text-text',
  'in-progress':
    'border-trust/40 bg-trust/10 text-text',
  completed:
    'border-success/40 bg-success/16 text-text',
  verified:
    'border-success/35 bg-success/14 text-text',
  paused:
    'border-border bg-surface2/80 text-text3',
  cancelled:
    'border-border bg-muted/40 text-text3',
  failed:
    'border-danger/40 bg-danger/12 text-text',
  disputed:
    'border-danger/35 bg-[hsl(var(--warning)/0.12)] text-text',
  'needs-action':
    'border-[hsl(var(--action)/0.5)] bg-[hsl(var(--action)/0.18)] text-text font-bold',
};

/** @deprecated Prefer `variant` for booking-specific tones */
export type StatusPillTone = 'success' | 'pending' | 'warning' | 'dispute';

const TONE_TO_VARIANT: Record<StatusPillTone, StatusPillVariant> = {
  success: 'completed',
  pending: 'pending',
  warning: 'needs-action',
  dispute: 'disputed',
};

type StatusPillProps = {
  children: React.ReactNode;
  className?: string;
} & (
  | { variant: StatusPillVariant; tone?: never }
  | { tone: StatusPillTone; variant?: never }
);

/**
 * Dense operational status — readable on Warm Linen / card surfaces.
 */
export function StatusPill(props: StatusPillProps) {
  const { children, className } = props;
  const variant: StatusPillVariant =
    'variant' in props && props.variant
      ? props.variant
      : 'tone' in props && props.tone
        ? TONE_TO_VARIANT[props.tone]
        : 'pending';

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide',
        VARIANT_CLASSES[variant],
        className
      )}
    >
      {children}
    </span>
  );
}

/** Map raw backend/booking status strings → StatusPill variant */
export function bookingStatusToPillVariant(status: string): StatusPillVariant {
  const s = (status || '').toLowerCase().replace(/\s+/g, '_');

  if (
    ['awaiting_payment', 'awaiting_remaining_payment', 'payment_required', 'awaiting_customer_confirmation'].includes(
      s
    )
  ) {
    return 'awaiting-payment';
  }
  if (['cancelled', 'declined', 'expired_unpaid'].includes(s)) return 'cancelled';
  if (s === 'failed') return 'failed';
  if (s.includes('dispute')) return 'disputed';
  if (['completed', 'paid', 'fully_paid'].includes(s)) return 'completed';
  if (['in_progress', 'pro_en_route', 'on_the_way', 'arrived'].includes(s)) return 'in-progress';
  if (['accepted', 'deposit_paid'].includes(s)) return 'accepted';
  if (['requested'].includes(s)) return 'requested';
  if (['pending', 'scheduled'].includes(s)) return 'pending';
  if (s.includes('verify')) return 'verified';
  if (s.includes('pause')) return 'paused';
  return 'pending';
}
