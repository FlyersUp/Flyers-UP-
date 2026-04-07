'use client';

import { cn } from '@/lib/cn';

export function PriceRow({
  label,
  value,
  subtext,
  emphasize = false,
  className,
}: {
  label: string;
  value: string;
  subtext?: string;
  emphasize?: boolean;
  className?: string;
}) {
  return (
    <div className={cn('flex items-start justify-between gap-4', className)}>
      <div className="min-w-0">
        <p
          className={cn(
            'text-sm',
            emphasize ? 'font-semibold text-[#111827] dark:text-white' : 'text-[#6B7280] dark:text-white/60'
          )}
        >
          {label}
        </p>
        {subtext ? (
          <p className="mt-0.5 text-xs text-[#6B7280] dark:text-white/55">{subtext}</p>
        ) : null}
      </div>
      <p
        className={cn(
          'text-sm tabular-nums',
          emphasize ? 'font-semibold text-[#4A69BD] dark:text-[#6b8fd4]' : 'text-[#2d3436] dark:text-white/90'
        )}
      >
        {value}
      </p>
    </div>
  );
}
