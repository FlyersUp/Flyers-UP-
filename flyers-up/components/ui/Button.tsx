'use client';

import { ReactNode, ButtonHTMLAttributes } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost';
  children: ReactNode;
  showArrow?: boolean;
}

/**
 * Button component with arrow/chevron on CTAs
 * Supports customer (green) and pro (orange) themes
 */
export function Button({ 
  variant = 'primary', 
  children, 
  showArrow = true,
  className = '',
  ...props 
}: ButtonProps) {
  const baseStyles = [
    'px-6 py-3 rounded-[var(--radius-lg)] font-medium',
    'transition-all duration-[var(--transition-base)]',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-bg',
    'active:scale-[0.985] disabled:opacity-55 disabled:cursor-not-allowed',
    'flex items-center justify-center gap-2',
  ].join(' ');
  
  const variants = {
    primary:
      'bg-accentOrange text-[hsl(var(--accent-contrast))] border border-[hsl(var(--accent-pro)/0.65)] shadow-[var(--shadow-1)] hover:bg-[hsl(var(--accent-pro)/0.92)] focus-visible:ring-[hsl(var(--accent-pro)/0.45)]',
    secondary:
      'border border-[hsl(var(--accent-customer)/0.55)] bg-[hsl(var(--accent-customer)/0.16)] text-text hover:bg-[hsl(var(--accent-customer)/0.24)] focus-visible:ring-[hsl(var(--accent-customer)/0.45)]',
    ghost:
      'border border-border bg-surface text-text hover:bg-hover focus-visible:ring-[hsl(var(--accent-customer)/0.35)]',
  };

  return (
    <button
      className={`${baseStyles} ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
      {showArrow && variant === 'primary' && (
        <span className="text-base opacity-80">→</span>
      )}
    </button>
  );
}

