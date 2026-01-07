'use client';

import { ReactNode, ButtonHTMLAttributes } from 'react';
import { useTheme } from '@/contexts/ThemeContext';

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
  const { primaryColor, primaryColorDark } = useTheme();

  const baseStyles = 'px-6 py-3 rounded-xl font-semibold transition-all focus-ring btn-press flex items-center justify-center gap-2';
  
  const variants = {
    primary: `text-white shadow-sm hover:shadow-md`,
    secondary: `border-2 bg-white hover:bg-gray-50`,
    ghost: `bg-transparent hover:bg-gray-100`,
  };

  const style = variant === 'primary' 
    ? { backgroundColor: primaryColor } as React.CSSProperties
    : variant === 'secondary'
    ? { borderColor: primaryColor, color: primaryColor } as React.CSSProperties
    : { color: primaryColor } as React.CSSProperties;

  return (
    <button
      className={`${baseStyles} ${variants[variant]} ${className}`}
      style={style}
      {...props}
    >
      {children}
      {showArrow && variant === 'primary' && (
        <span className="text-lg">→</span>
      )}
    </button>
  );
}

