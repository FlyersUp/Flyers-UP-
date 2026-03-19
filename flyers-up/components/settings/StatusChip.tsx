'use client';

/**
 * Status chip with consistent mapping:
 * - Verified (green tint)
 * - Pending (amber tint)
 * - Not started (neutral)
 * - Needs attention (red tint)
 */
export type StatusVariant = 'verified' | 'pending' | 'not_started' | 'needs_attention' | 'good' | 'warning';

export interface StatusChipProps {
  status: StatusVariant;
  label: string;
  className?: string;
}

const VARIANT_STYLES: Record<StatusVariant, string> = {
  verified: 'bg-[hsl(var(--accent-customer)/0.18)] text-text border-[hsl(var(--accent-customer)/0.45)]',
  pending: 'bg-[hsl(var(--accent-pro)/0.2)] text-text border-[hsl(var(--accent-pro)/0.48)]',
  not_started: 'bg-surface2 text-text3 border-border',
  needs_attention: 'bg-danger/15 text-text border-danger/40',
  good: 'bg-[hsl(var(--accent-customer)/0.18)] text-text border-[hsl(var(--accent-customer)/0.45)]',
  warning: 'bg-[hsl(var(--accent-pro)/0.2)] text-text border-[hsl(var(--accent-pro)/0.48)]',
};

export function StatusChip({ status, label, className = '' }: StatusChipProps) {
  const styles = VARIANT_STYLES[status] ?? VARIANT_STYLES.not_started;
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium border ${styles} ${className}`}
    >
      {label}
    </span>
  );
}
