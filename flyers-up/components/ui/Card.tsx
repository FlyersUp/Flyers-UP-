'use client';

import { ReactNode, ElementType, createElement } from 'react';
import { Rail } from './Rail';
import { cn } from '@/lib/cn';

const CARD_BASE = 'bg-white dark:bg-[#222225] rounded-2xl border border-black/5 dark:border-white/10 shadow-sm';

const PADDING = {
  sm: 'p-3',
  md: 'p-4',
  lg: 'p-6',
} as const;

export interface CardProps {
  children: ReactNode;
  className?: string;
  /** Element type (default: div) */
  as?: ElementType;
  /** Padding size (default: md) */
  padding?: 'sm' | 'md' | 'lg';
  /** Legacy: show left rail + stripe */
  withRail?: boolean;
  /** Legacy: click handler */
  onClick?: () => void;
  /** Legacy: selected state */
  selected?: boolean;
  /** Legacy: tone for accent density */
  tone?: 'default' | 'tint';
}

/**
 * Premium marketplace card: bg-white, rounded-2xl, border-black/5, shadow-sm.
 * Consistent across the app for a $100M marketplace feel.
 */
export function Card({
  children,
  className = '',
  as: Component = 'div',
  padding = 'md',
  withRail = false,
  onClick,
  selected = false,
  tone = 'default',
}: CardProps) {
  const paddingClass = PADDING[padding];
  const interactiveClass = onClick ? 'cursor-pointer hover:shadow-md transition-all duration-200' : '';

  const content = withRail ? (
    <>
      <Rail className="rounded-l-2xl" />
      <div className={cn('flex-1', paddingClass, 'pl-4')}>
        {children}
      </div>
    </>
  ) : (
    <div className={paddingClass}>
      {children}
    </div>
  );

  return createElement(
    Component,
    {
      'data-selected': selected ? 'true' : undefined,
      'data-tone': tone,
      className: cn(
        CARD_BASE,
        'surface-card',
        interactiveClass,
        withRail && 'flex overflow-hidden',
        className
      ),
      onClick,
    },
    content
  );
}
