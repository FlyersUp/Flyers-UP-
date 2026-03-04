'use client';

/**
 * Badge for pro payout status: none | pending | succeeded | failed.
 */

interface PayoutStatusBadgeProps {
  payoutStatus?: string | null;
  className?: string;
}

export function PayoutStatusBadge({
  payoutStatus,
  className = '',
}: PayoutStatusBadgeProps) {
  const status = payoutStatus ?? 'none';
  const label =
    status === 'succeeded' || status === 'paid'
      ? 'Paid'
      : status === 'pending' || status === 'in_transit'
        ? 'Pending'
        : status === 'failed'
          ? 'Failed'
          : '—';

  if (status === 'none' || status === '' || !label || label === '—') {
    return null;
  }

  const variant =
    status === 'succeeded' || status === 'paid'
      ? 'bg-green-100 text-green-800'
      : status === 'pending' || status === 'in_transit'
        ? 'bg-amber-100 text-amber-800'
        : status === 'failed'
          ? 'bg-red-100 text-red-800'
          : 'bg-gray-100 text-gray-600';

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${variant} ${className}`}
      data-payout-status={status}
    >
      {label}
    </span>
  );
}
