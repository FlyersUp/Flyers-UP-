'use client';

import { ReactNode } from 'react';

interface LabelProps {
  children: ReactNode;
  className?: string;
  /** section: subtle underline for headers; card: inline for card titles; pill: boxed (rare) */
  variant?: 'section' | 'card' | 'pill';
}

/**
 * Section label: subtle, not shouty.
 * - section: small muted text with underline (for page/section headers)
 * - card: inline for card row titles (no underline)
 * - pill: legacy boxed style for rare cases
 */
export function Label({ children, className = '', variant = 'section' }: LabelProps) {
  if (variant === 'pill') {
    return (
      <span
        className={`inline-block px-2.5 py-1 text-xs font-medium tracking-wide text-muted border border-hairline bg-surface2 rounded-md ${className}`}
      >
        {children}
      </span>
    );
  }
  if (variant === 'card') {
    return (
      <span className={`inline-flex items-center gap-2 text-sm font-medium text-text ${className}`}>
        {children}
      </span>
    );
  }
  /* section: subtle label with underline */
  return (
    <span
      className={`block text-xs font-medium text-muted border-b border-[var(--hairline)] pb-1.5 mb-2 w-fit ${className}`}
    >
      {children}
    </span>
  );
}












