'use client';

import { ReactNode } from 'react';
import { cn } from '@/lib/cn';

export interface CardSectionProps {
  children: ReactNode;
  className?: string;
}

/**
 * Section divider for lists inside cards.
 * Use for settings rows, grouped content.
 */
export function CardSection({ children, className = '' }: CardSectionProps) {
  return (
    <div className={cn('border-t border-black/5 py-3', className)}>
      {children}
    </div>
  );
}
