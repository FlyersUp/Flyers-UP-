'use client';

import {
  type ReactNode,
  type ElementType,
  createElement,
  type HTMLAttributes,
  forwardRef,
} from 'react';
import { Rail } from './Rail';
import { cn } from '@/lib/cn';

const CARD_ROUNDED = 'rounded-2xl';

const VARIANT_BASE: Record<CardVariant, string> = {
  default: 'border border-border bg-[hsl(var(--card-neutral))] shadow-[var(--shadow-card)]',
  elevated:
    'border border-border bg-[hsl(var(--card-neutral))] shadow-[0_8px_30px_rgba(45,52,54,0.08)]',
  tinted: 'border border-border bg-surface2/90 shadow-[var(--shadow-card)]',
  trust:
    'border border-border border-t-[3px] border-t-trust bg-[hsl(var(--card-neutral))] shadow-[var(--shadow-card)] ring-1 ring-trust/12',
  action:
    'border border-border border-t-[3px] border-t-action bg-[hsl(var(--card-neutral))] shadow-[var(--shadow-card)] ring-1 ring-action/15',
};

const PADDING = {
  sm: 'p-3',
  md: 'p-4',
  lg: 'p-6',
} as const;

export type CardVariant = 'default' | 'elevated' | 'tinted' | 'trust' | 'action';

export interface CardProps extends HTMLAttributes<HTMLElement> {
  children: ReactNode;
  className?: string;
  as?: ElementType;
  padding?: 'sm' | 'md' | 'lg';
  /** Visual hierarchy */
  variant?: CardVariant;
  withRail?: boolean;
  selected?: boolean;
  tone?: 'default' | 'tint';
}

/**
 * Marketplace card family — Flyers Up linen / cloud / trust system.
 */
export function Card({
  children,
  className = '',
  as: Component = 'div',
  padding = 'md',
  variant = 'default',
  withRail = false,
  onClick,
  selected = false,
  tone = 'default',
  ...rest
}: CardProps) {
  const paddingClass = PADDING[padding];
  const interactiveClass = onClick
    ? 'cursor-pointer hover:shadow-[var(--shadow-card-hover)] hover:-translate-y-0.5 transition-all duration-200'
    : '';

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
        CARD_ROUNDED,
        VARIANT_BASE[variant],
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

export const CardHeader = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  function CardHeader({ className, ...props }, ref) {
    return (
      <div
        ref={ref}
        className={cn('flex flex-col gap-1.5 pb-4', className)}
        {...props}
      />
    );
  }
);

export const CardTitle = forwardRef<HTMLHeadingElement, HTMLAttributes<HTMLHeadingElement>>(
  function CardTitle({ className, ...props }, ref) {
    return (
      <h3
        ref={ref}
        className={cn('text-lg font-semibold leading-tight text-text', className)}
        {...props}
      />
    );
  }
);

export const CardDescription = forwardRef<HTMLParagraphElement, HTMLAttributes<HTMLParagraphElement>>(
  function CardDescription({ className, ...props }, ref) {
    return (
      <p
        ref={ref}
        className={cn('text-sm text-text3', className)}
        {...props}
      />
    );
  }
);

export const CardContent = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  function CardContent({ className, ...props }, ref) {
    return <div ref={ref} className={cn('pt-0', className)} {...props} />;
  }
);

export const CardFooter = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  function CardFooter({ className, ...props }, ref) {
    return (
      <div
        ref={ref}
        className={cn('flex flex-wrap items-center gap-2 pt-4', className)}
        {...props}
      />
    );
  }
);
