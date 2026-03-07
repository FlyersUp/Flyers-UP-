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
  'pending payment': { bg: 'bg-amber-50 dark:bg-amber-900/30', text: 'text-amber-800 dark:text-amber-200', label: 'Pending Payment' },
  'awaiting_payment': { bg: 'bg-amber-50 dark:bg-amber-900/30', text: 'text-amber-800 dark:text-amber-200', label: 'Pending Payment' },
  'completed': { bg: 'bg-emerald-50 dark:bg-emerald-900/30', text: 'text-emerald-800 dark:text-[#9FE38F]', label: 'Completed' },
  'pro en route': { bg: 'bg-emerald-50 dark:bg-emerald-900/30', text: 'text-emerald-800 dark:text-[#9FE38F]', label: 'Pro En Route' },
  'pro_en_route': { bg: 'bg-emerald-50 dark:bg-emerald-900/30', text: 'text-emerald-800 dark:text-[#9FE38F]', label: 'Pro En Route' },
  'in progress': { bg: 'bg-emerald-100 dark:bg-emerald-900/40', text: 'text-emerald-900 dark:text-[#9FE38F]', label: 'In Progress' },
  'in_progress': { bg: 'bg-emerald-100 dark:bg-emerald-900/40', text: 'text-emerald-900 dark:text-[#9FE38F]', label: 'In Progress' },
  'active': { bg: 'bg-emerald-100 dark:bg-emerald-900/40', text: 'text-emerald-900 dark:text-[#9FE38F]', label: 'In Progress' },
  'declined': { bg: 'bg-red-50 dark:bg-red-900/30', text: 'text-red-800 dark:text-[#F07A7A]', label: 'Declined' },
  'cancelled': { bg: 'bg-red-50 dark:bg-red-900/30', text: 'text-red-800 dark:text-[#F07A7A]', label: 'Declined' },
  'inquiry': { bg: 'bg-gray-100 dark:bg-[#1D2128]', text: 'text-gray-700 dark:text-[#A1A8B3]', label: 'Inquiry' },
  'requested': { bg: 'bg-gray-100 dark:bg-[#1D2128]', text: 'text-gray-700 dark:text-[#A1A8B3]', label: 'Requested' },
  'scheduled': { bg: 'bg-gray-100 dark:bg-[#1D2128]', text: 'text-gray-700 dark:text-[#A1A8B3]', label: 'Scheduled' },
};

function getConfig(status: string): { bg: string; text: string; label: string } {
  const s = status.toLowerCase().trim();
  return STATUS_CONFIG[s] ?? {
    bg: 'bg-gray-100 dark:bg-[#1D2128]',
    text: 'text-gray-700 dark:text-[#A1A8B3]',
    label: status.replaceAll('_', ' '),
  };
}

export function StatusBadge({ status, className = '' }: StatusBadgeProps) {
  const config = getConfig(status);
  return (
    <span
      className={`inline-flex items-center px-3 py-1 rounded-full text-[11px] font-medium tracking-wide border border-[#E5E5E5] dark:border-white/10 ${config.bg} ${config.text} ${className}`}
    >
      {config.label}
    </span>
  );
}
