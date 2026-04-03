import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

export function MarketingCard({
  children,
  className,
  hover = false,
}: {
  children: ReactNode;
  className?: string;
  hover?: boolean;
}) {
  return (
    <div
      className={cn(
        'rounded-2xl border border-market-line/90 bg-white p-6 shadow-[0_4px_18px_rgba(45,52,54,0.07)]',
        hover && 'transition-all duration-200 hover:-translate-y-1 hover:shadow-[0_12px_28px_rgba(45,52,54,0.1)]',
        className
      )}
    >
      {children}
    </div>
  );
}
