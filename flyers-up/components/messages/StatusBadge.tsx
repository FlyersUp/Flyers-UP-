'use client';

/**
 * Status badge for conversation/job statuses in Messages.
 * Pill shape, light tints, no heavy borders.
 * One badge per state; split into two chips only if data has combined states.
 */
interface StatusBadgeProps {
  status: string;
  className?: string;
}

const STATUS_CONFIG: Record<string, { bg: string; text: string; label: string }> = {
  'pending payment': { bg: 'bg-amber-50', text: 'text-amber-800', label: 'Pending Payment' },
  'awaiting_payment': { bg: 'bg-amber-50', text: 'text-amber-800', label: 'Pending Payment' },
  'completed': { bg: 'bg-emerald-50', text: 'text-emerald-800', label: 'Completed' },
  'pro en route': { bg: 'bg-emerald-50', text: 'text-emerald-800', label: 'Pro En Route' },
  'pro_en_route': { bg: 'bg-emerald-50', text: 'text-emerald-800', label: 'Pro En Route' },
  'in progress': { bg: 'bg-emerald-100', text: 'text-emerald-900', label: 'In Progress' },
  'in_progress': { bg: 'bg-emerald-100', text: 'text-emerald-900', label: 'In Progress' },
  'active': { bg: 'bg-emerald-100', text: 'text-emerald-900', label: 'In Progress' },
  'declined': { bg: 'bg-red-50', text: 'text-red-800', label: 'Declined' },
  'cancelled': { bg: 'bg-red-50', text: 'text-red-800', label: 'Declined' },
  'inquiry': { bg: 'bg-surface2', text: 'text-muted', label: 'Inquiry' },
  'requested': { bg: 'bg-surface2', text: 'text-muted', label: 'Requested' },
  'scheduled': { bg: 'bg-surface2', text: 'text-muted', label: 'Scheduled' },
};

function getConfig(status: string): { bg: string; text: string; label: string } {
  const s = status.toLowerCase().trim();
  return STATUS_CONFIG[s] ?? {
    bg: 'bg-surface2',
    text: 'text-muted',
    label: status.replaceAll('_', ' '),
  };
}

export function StatusBadge({ status, className = '' }: StatusBadgeProps) {
  const config = getConfig(status);
  return (
    <span
      className={`inline-flex items-center px-3 py-1 rounded-full text-[11px] font-medium tracking-wide border border-black/5 ${config.bg} ${config.text} ${className}`}
    >
      {config.label}
    </span>
  );
}
