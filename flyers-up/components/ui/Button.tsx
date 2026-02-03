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
  const baseStyles = 'px-6 py-3 rounded-xl font-semibold transition-all focus-ring btn-press flex items-center justify-center gap-2';
  
  const variants = {
    primary: `bg-accent text-accentContrast shadow-sm hover:shadow-md`,
    // Keep secondary calm + neutral; accent is for indicators, not full outlines.
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
        <span className="text-lg">→</span>
      )}
    </button>
  );
}

