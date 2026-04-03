import { forwardRef, type ReactNode } from 'react';
import { cn } from '@/lib/cn';

export const MarketingSection = forwardRef<
  HTMLElement,
  {
    children: ReactNode;
    className?: string;
    id?: string;
    'aria-label'?: string;
  }
>(function MarketingSection({ children, className, id, 'aria-label': ariaLabel }, ref) {
  return (
    <section ref={ref} id={id} aria-label={ariaLabel} className={cn('px-4 py-16 md:py-20', className)}>
      <div className="mx-auto max-w-6xl">{children}</div>
    </section>
  );
});
