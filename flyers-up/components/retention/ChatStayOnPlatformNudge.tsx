'use client';

import { ProtectedFlyersUpBadge } from '@/components/retention/ProtectedFlyersUpBadge';
import { cn } from '@/lib/cn';

export function ChatStayOnPlatformNudge({ className = '' }: { className?: string }) {
  return (
    <div
      className={cn(
        'rounded-xl border border-emerald-200/50 bg-emerald-50/80 dark:border-emerald-800/40 dark:bg-emerald-950/30 px-3 py-2.5 text-xs text-emerald-950 dark:text-emerald-50/95',
        className
      )}
      role="status"
    >
      <div className="flex flex-wrap items-center gap-2 mb-1.5">
        <ProtectedFlyersUpBadge />
      </div>
      <p className="leading-relaxed">
        Just a friendly heads-up: paying and scheduling through Flyers Up keeps your booking protected, with
        receipts and support on your side if you need it.
      </p>
    </div>
  );
}
