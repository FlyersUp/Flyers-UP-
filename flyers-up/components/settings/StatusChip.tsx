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
  verified: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  pending: 'bg-amber-50 text-amber-800 border-amber-200',
  not_started: 'bg-black/5 text-muted border-black/10',
  needs_attention: 'bg-red-50 text-red-800 border-red-200',
  good: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  warning: 'bg-amber-50 text-amber-800 border-amber-200',
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
