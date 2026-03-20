'use client';

import { ReactNode, ElementType, createElement, HTMLAttributes } from 'react';
import { Rail } from './Rail';
import { cn } from '@/lib/cn';

const CARD_BASE = 'rounded-2xl border border-border shadow-[var(--shadow-card)]';

const PADDING = {
  sm: 'p-3',
  md: 'p-4',
  lg: 'p-6',
} as const;

export interface CardProps extends HTMLAttributes<HTMLElement> {
  children: ReactNode;
  className?: string;
  /** Element type (default: div) */
  as?: ElementType;
  /** Padding size (default: md) */
  padding?: 'sm' | 'md' | 'lg';
  /** Legacy: show left rail + stripe */
  withRail?: boolean;
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
  ...rest
}: CardProps) {
  const paddingClass = PADDING[padding];
  const interactiveClass = onClick ? 'cursor-pointer hover:shadow-[var(--shadow-card-hover)] hover:-translate-y-0.5 transition-all duration-200' : '';

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
        'bg-[hsl(var(--card-neutral))]',
        interactiveClass,
        withRail && 'flex overflow-hidden',
        className
      ),
      onClick,
      ...rest,
    },
    content
  );
}
