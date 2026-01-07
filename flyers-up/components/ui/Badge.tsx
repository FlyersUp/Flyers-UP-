'use client';

import { ReactNode } from 'react';
import { useTheme } from '@/contexts/ThemeContext';

interface BadgeProps {
  children: ReactNode;
  variant?: 'default' | 'verified' | 'highlight';
  className?: string;
}

/**
 * Small capsule-style badge
 * Examples: "VERIFIED PRO", "BACKGROUND CHECKED", "LLC VERIFIED"
 */
export function Badge({ children, variant = 'default', className = '' }: BadgeProps) {
  // Use theme if available, otherwise use default colors
  let primaryColor = '#A8E6CF'; // Default customer color
  try {
    const theme = useTheme();
    primaryColor = theme.primaryColor;
  } catch {
    // ThemeProvider not available, use default
  }

  const variants = {
    default: 'bg-gray-100 text-gray-700 border-gray-300',
    verified: 'bg-white text-gray-700 border',
    highlight: 'bg-white text-gray-900 border-2',
  };

  const style = variant === 'highlight' 
    ? { borderColor: primaryColor } as React.CSSProperties
    : {};

  return (
    <span
      className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${variants[variant]} ${className}`}
      style={style}
    >
      {children}
    </span>
  );
}

// Default export for backward compatibility
export default Badge;

/**
 * Verified Badge Component
 * Shows a verified checkmark badge
 */
interface VerifiedBadgeProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function VerifiedBadge({ size = 'sm', className = '' }: VerifiedBadgeProps) {
  // Use theme if available, otherwise use default colors
  let primaryColor = '#A8E6CF'; // Default customer color
  try {
    const theme = useTheme();
    primaryColor = theme.primaryColor;
  } catch {
    // ThemeProvider not available, use default
  }
  
  const sizeClasses = {
    sm: 'w-4 h-4 text-xs',
    md: 'w-5 h-5 text-sm',
    lg: 'w-6 h-6 text-base',
  };

  return (
    <span
      className={`inline-flex items-center justify-center rounded-full bg-[#A8E6CF] text-white ${sizeClasses[size]} ${className}`}
      style={{ backgroundColor: primaryColor }}
      aria-label="Verified"
    >
      ✓
    </span>
  );
}

/**
 * Level Badge Component
 * Shows a pro's level/experience badge
 */
interface LevelBadgeProps {
  level?: string | number;
  title?: string;
  className?: string;
}

export function LevelBadge({ level, title, className = '' }: LevelBadgeProps) {
  // Use theme if available, otherwise use default colors
  let primaryColor = '#A8E6CF'; // Default customer color
  try {
    const theme = useTheme();
    primaryColor = theme.primaryColor;
  } catch {
    // ThemeProvider not available, use default
  }
  
  if (!level && !title) return null;

  return (
    <span
      className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border-2 bg-white ${className}`}
      style={{ borderColor: primaryColor, color: primaryColor }}
    >
      {title || `Level ${level}`}
    </span>
  );
}

/**
 * Status Badge Component
 * Shows job/booking status
 */
interface StatusBadgeProps {
  status: string;
  className?: string;
}

export function StatusBadge({ status, className = '' }: StatusBadgeProps) {
  const statusColors: Record<string, { bg: string; text: string; border: string }> = {
    pending: { bg: 'bg-yellow-50', text: 'text-yellow-700', border: 'border-yellow-200' },
    scheduled: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
    active: { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200' },
    completed: { bg: 'bg-gray-50', text: 'text-gray-700', border: 'border-gray-200' },
    cancelled: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200' },
  };

  const statusConfig = statusColors[status.toLowerCase()] || statusColors.pending;
  const displayStatus = status.charAt(0).toUpperCase() + status.slice(1).toLowerCase();

  return (
    <span
      className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${statusConfig.bg} ${statusConfig.text} ${statusConfig.border} ${className}`}
    >
      {displayStatus}
    </span>
  );
}
