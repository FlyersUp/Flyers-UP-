'use client';

import { ReactNode } from 'react';
import { Rail } from './Rail';
import { useTheme } from '@/contexts/ThemeContext';

interface CardProps {
  children: ReactNode;
  withRail?: boolean;
  className?: string;
  onClick?: () => void;
}

/**
 * Card component with optional left rail + stripe
 */
export function Card({ children, withRail = false, className = '', onClick }: CardProps) {
  const baseStyles = 'bg-white rounded-xl shadow-sm border border-gray-200';
  const interactiveStyles = onClick ? 'cursor-pointer hover:shadow-md transition-shadow' : '';

  return (
    <div 
      className={`${baseStyles} ${interactiveStyles} ${className} flex`}
      onClick={onClick}
    >
      {withRail && <Rail className="rounded-l-xl" />}
      <div className="flex-1 p-6">
        {children}
      </div>
    </div>
  );
}












