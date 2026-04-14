'use client';

import { Shield } from 'lucide-react';
import { cn } from '@/lib/cn';

export function ProtectedFlyersUpBadge({ className = '' }: { className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border border-emerald-200/60 bg-emerald-50/90 px-2.5 py-0.5 text-[11px] font-medium text-emerald-900 dark:border-emerald-800/50 dark:bg-emerald-950/40 dark:text-emerald-100',
        className
      )}
    >
      <Shield className="h-3 w-3 shrink-0 opacity-80" aria-hidden />
      Protected on Flyers Up
    </span>
  );
}
