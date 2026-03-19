'use client';

import { ChevronRight } from 'lucide-react';
import { cn } from '@/lib/cn';

export function ListRow({
  icon,
  title,
  subtext,
  className,
  rightSlot,
}: {
  icon: React.ReactNode;
  title: string;
  subtext?: string;
  className?: string;
  rightSlot?: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        'flex items-center gap-3 rounded-xl border border-border bg-surface px-3.5 py-3 shadow-[var(--shadow-1)]',
        className
      )}
    >
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-card text-muted-foreground">
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-foreground line-clamp-1">{title}</p>
        {subtext ? <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2">{subtext}</p> : null}
      </div>
      <div className="shrink-0 text-muted-foreground">
        {rightSlot ?? <ChevronRight size={16} />}
      </div>
    </div>
  );
}
