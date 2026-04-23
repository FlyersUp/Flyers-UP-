'use client';

import { cn } from '@/lib/cn';

export interface ServiceChipsProps {
  labels: string[];
  className?: string;
  /** Optional selection (controlled) */
  activeLabel?: string | null;
  onSelect?: (label: string) => void;
}

export function ServiceChips({ labels, className, activeLabel, onSelect }: ServiceChipsProps) {
  return (
    <div className={cn('flex flex-wrap gap-2', className)}>
      {labels.map((label) => {
        const active = activeLabel === label;
        return (
          <button
            key={label}
            type="button"
            onClick={() => onSelect?.(label)}
            className={cn(
              'rounded-full border px-3 py-1.5 text-xs font-medium transition-colors',
              active
                ? 'border-amber-300 bg-[hsl(33_100%_94%)] text-amber-950'
                : 'border-[hsl(var(--trust))]/15 bg-[hsl(222_44%_97%)] text-[hsl(var(--trust))] hover:bg-[hsl(222_44%_94%)]',
              !onSelect && 'cursor-default'
            )}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}
