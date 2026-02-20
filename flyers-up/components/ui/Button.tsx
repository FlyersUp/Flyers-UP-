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
  const baseStyles = 'px-6 py-3 rounded-[var(--radius-lg)] font-medium transition-all duration-[var(--transition-base)] focus-ring btn-press flex items-center justify-center gap-2';
  
  const variants = {
    primary: `bg-accent text-accentContrast shadow-[var(--shadow-1)] hover:opacity-95`,
    secondary: `border border-[var(--surface-border)] bg-surface text-text hover:bg-surface2`,
    ghost: `bg-transparent text-text hover:bg-surface2`,
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

