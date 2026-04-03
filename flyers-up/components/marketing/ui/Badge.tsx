import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { ShieldCheck } from 'lucide-react';

export function MarketingVerifiedBadge({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full bg-market-orange px-2.5 py-1 text-xs font-semibold text-white shadow-sm',
        className
      )}
    >
      <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-white" strokeWidth={2.25} aria-hidden />
      Verified
    </span>
  );
}

export function MarketingBadge({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full bg-market-cloud px-2.5 py-1 text-xs font-medium text-market-charcoal/80',
        className
      )}
    >
      {children}
    </span>
  );
}
