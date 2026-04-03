'use client';

import {
  forwardRef,
  type ButtonHTMLAttributes,
  type ReactNode,
} from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/cn';

export type ButtonVariant =
  | 'primary'
  | 'trust'
  | 'secondary'
  | 'ghost'
  | 'outline'
  | 'success'
  | 'destructive';

export type ButtonSize = 'sm' | 'md' | 'lg' | 'icon';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Replaces default arrow on legacy primary */
  showArrow?: boolean;
  loading?: boolean;
  iconLeft?: ReactNode;
  iconRight?: ReactNode;
  children?: ReactNode;
}

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'min-h-9 px-3.5 py-2 text-sm rounded-xl gap-1.5',
  md: 'min-h-11 px-5 py-2.5 text-sm rounded-xl gap-2',
  lg: 'min-h-12 px-6 py-3.5 text-base rounded-2xl gap-2',
  icon: 'h-10 w-10 shrink-0 rounded-xl p-0',
};

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    'bg-accentOrange text-actionFg border border-[hsl(var(--action-hover)/0.45)] shadow-[var(--shadow-1)] hover:bg-[hsl(var(--action-hover))] focus-visible:ring-action/40',
  trust:
    'bg-trust text-trustFg border border-[hsl(var(--trust-hover)/0.5)] shadow-sm hover:bg-[hsl(var(--trust-hover))] focus-visible:ring-trust/40',
  secondary:
    'bg-surface2 text-text border border-border hover:bg-hover focus-visible:ring-trust/25',
  ghost:
    'bg-transparent text-text border border-transparent hover:bg-surface2/80 focus-visible:ring-trust/25',
  outline:
    'bg-bg text-trust border-2 border-trust/35 hover:bg-surface2 focus-visible:ring-trust/30',
  success:
    'bg-success text-successFg border border-[hsl(var(--success)/0.5)] hover:brightness-[0.97] focus-visible:ring-success/40',
  destructive:
    'bg-danger/95 text-white border border-danger hover:bg-danger focus-visible:ring-danger/35',
};

const baseClasses =
  'inline-flex items-center justify-center font-semibold transition-all duration-[var(--transition-base)] ' +
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-bg ' +
  'active:scale-[0.985] disabled:pointer-events-none disabled:opacity-50';

/**
 * Flyers Up — unified action button (trust slate + pastel orange CTAs).
 */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = 'primary',
    size = 'md',
    className,
    children,
    showArrow = true,
    loading,
    disabled,
    iconLeft,
    iconRight,
    ...props
  },
  ref
) {
  const isIconOnly = size === 'icon';
  const showLegacyArrow =
    showArrow && variant === 'primary' && !loading && !iconRight && !isIconOnly;

  return (
    <button
      ref={ref}
      type="button"
      className={cn(baseClasses, sizeClasses[size], variantClasses[variant], className)}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {isIconOnly ? (
        loading ? (
          <Loader2 className="h-4 w-4 shrink-0 animate-spin" aria-hidden />
        ) : (
          children
        )
      ) : (
        <>
          {loading ? (
            <Loader2 className="h-4 w-4 shrink-0 animate-spin" aria-hidden />
          ) : (
            iconLeft
          )}
          {children}
          {!loading && iconRight}
          {showLegacyArrow && <span className="text-base opacity-80">→</span>}
        </>
      )}
    </button>
  );
});
