'use client';

import { cn } from '@/lib/cn';

type StatusPillTone = 'success' | 'pending' | 'warning' | 'dispute';

const TONE_CLASSES: Record<StatusPillTone, string> = {
  success: 'border-[hsl(var(--success)/0.45)] bg-[hsl(var(--success)/0.16)] text-foreground',
  pending: 'border-border bg-surface text-muted-foreground',
  warning: 'border-[hsl(var(--warning)/0.45)] bg-[hsl(var(--warning)/0.16)] text-foreground',
  dispute: 'border-[hsl(var(--danger)/0.45)] bg-[hsl(var(--danger)/0.16)] text-foreground',
};

export function StatusPill({
  tone,
  children,
  className,
}: {
  tone: StatusPillTone;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide',
        TONE_CLASSES[tone],
        className
      )}
    >
      {children}
    </span>
  );
}
