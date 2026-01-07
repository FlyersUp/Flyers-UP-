'use client';

import { ReactNode } from 'react';

interface LabelProps {
  children: ReactNode;
  className?: string;
}

/**
 * Boxed uppercase label using Oswald font
 * Used for section headers like "BOOKING STATUS", "VERIFIED PRO", etc.
 */
export function Label({ children, className = '' }: LabelProps) {
  return (
    <span
      className={`inline-block px-2 py-1 text-xs font-semibold tracking-wider uppercase border border-gray-300 bg-white ${className}`}
      style={{ fontFamily: 'var(--font-oswald)' }}
    >
      {children}
    </span>
  );
}









