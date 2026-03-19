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
        <p className={cn('text-sm', emphasize ? 'font-semibold text-foreground' : 'text-muted-foreground')}>
          {label}
        </p>
        {subtext ? <p className="mt-0.5 text-xs text-muted-foreground">{subtext}</p> : null}
      </div>
      <p className={cn('text-sm', emphasize ? 'font-semibold text-foreground' : 'text-foreground')}>{value}</p>
    </div>
  );
}
