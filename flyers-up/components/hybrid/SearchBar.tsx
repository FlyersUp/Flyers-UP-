'use client';

import type { ComponentProps } from 'react';
import { Search } from 'lucide-react';
import { cn } from '@/lib/cn';

export interface HybridSearchBarProps extends Omit<ComponentProps<'input'>, 'type'> {
  containerClassName?: string;
}

/** Rounded hero search field (mockup-aligned). */
export function HybridSearchBar({ containerClassName, className, placeholder, ...rest }: HybridSearchBarProps) {
  return (
    <div
      className={cn(
        'relative flex items-center rounded-2xl border border-border bg-surface shadow-[var(--shadow-sm)]',
        containerClassName
      )}
    >
      <Search className="pointer-events-none absolute left-4 h-5 w-5 text-text-3" aria-hidden />
      <input
        type="search"
        className={cn(
          'h-14 w-full rounded-2xl border-0 bg-transparent pl-12 pr-4 text-sm text-text placeholder:text-text-3 focus:outline-none focus:ring-2 focus:ring-[hsl(var(--trust))]/25',
          className
        )}
        placeholder={placeholder ?? 'What do you need help with?'}
        {...rest}
      />
    </div>
  );
}
