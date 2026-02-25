'use client';

/** DB statuses that map to UI. Treat requested and pending as equivalent. */
const ACTIVE_STATUSES = [
  'requested', 'pending', 'accepted', 'on_the_way', 'in_progress', 'awaiting_payment',
] as const;
const COMPLETED_STATUSES = ['completed'] as const;
const TERMINAL_STATUSES = ['cancelled', 'declined'] as const;

const STATUS_LABELS: Record<string, string> = {
  requested: 'Pending',
  pending: 'Pending',
  accepted: 'Accepted',
  on_the_way: 'On the way',
  in_progress: 'In progress',
  awaiting_payment: 'Completed',
  completed: 'Completed',
  cancelled: 'Cancelled',
  declined: 'Declined',
};

export interface BookingStatusBadgeProps {
  status: string;
  className?: string;
}

/**
 * Shared status badge for bookings. Uses Flyers Up accent colors.
 * - Completed/success: #B2FBA5 (green)
 * - Active/in-progress: #FFC067 (orange)
 * - Terminal (cancelled/declined): muted
 * - Pending: muted
 */
export function BookingStatusBadge({ status, className = '' }: BookingStatusBadgeProps) {
  const s = (status || '').toLowerCase();
  const label = STATUS_LABELS[s] ?? status.replaceAll('_', ' ');

  let bg: string;
  if (COMPLETED_STATUSES.includes(s as typeof COMPLETED_STATUSES[number]) || s === 'awaiting_payment') {
    bg = '#B2FBA5';
  } else if (ACTIVE_STATUSES.includes(s as typeof ACTIVE_STATUSES[number]) && !['requested', 'pending'].includes(s)) {
    bg = '#FFC067';
  } else if (TERMINAL_STATUSES.includes(s as typeof TERMINAL_STATUSES[number])) {
    bg = 'hsl(var(--muted) / 0.5)';
  } else {
    bg = 'hsl(var(--muted) / 0.5)';
  }

  return (
    <span
      className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${className}`}
      style={{
        backgroundColor: bg,
        color: 'hsl(var(--text))',
      }}
    >
      {label}
    </span>
  );
}
