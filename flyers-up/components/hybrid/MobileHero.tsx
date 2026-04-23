'use client';

import type { ReactNode } from 'react';
import type { TrustPill } from '@/lib/hybrid-ui/types';
import { cn } from '@/lib/cn';

const pillVariants: Record<TrustPill['variant'], string> = {
  accent: 'bg-[hsl(33_100%_94%)] text-amber-900 border border-amber-200/80',
  trust: 'bg-[hsl(222_44%_96%)] text-[hsl(var(--trust))] border border-[hsl(var(--trust))]/20',
  neutral: 'bg-surface2 text-text-2 border border-border',
};

export interface MobileHeroProps {
  pills?: TrustPill[];
  /** Rich headline — pass JSX for italic emphasis */
  title: ReactNode;
  subtitle?: ReactNode;
  className?: string;
}

export function MobileHero({ pills, title, subtitle, className }: MobileHeroProps) {
  return (
    <div className={cn('space-y-4 px-4', className)}>
      {pills && pills.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {pills.map((p) => (
            <span
              key={p.id}
              className={cn(
                'inline-flex items-center rounded-full px-3 py-1 text-[10px] font-semibold uppercase tracking-wide',
                pillVariants[p.variant]
              )}
            >
              {p.label}
            </span>
          ))}
        </div>
      ) : null}
      <h1 className="text-[1.65rem] font-bold leading-tight tracking-tight text-[hsl(var(--trust))] sm:text-3xl">
        {title}
      </h1>
      {subtitle ? <div className="text-sm leading-relaxed text-text-3">{subtitle}</div> : null}
    </div>
  );
}
