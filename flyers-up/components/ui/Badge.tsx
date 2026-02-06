'use client';

import { ReactNode } from 'react';

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
  const variants = {
    default: 'bg-badgeFill text-muted border-badgeBorder',
    verified: 'bg-badgeFill text-text border-badgeBorder',
    // Accent is an indicator only (not a full outline).
    highlight:
      "relative bg-badgeFill text-text border-badgeBorder pl-4 before:content-[''] before:absolute before:left-2 before:top-1/2 before:-translate-y-1/2 before:h-3 before:w-1 before:rounded-full before:bg-accent/80",
  };

  return (
    <span
      className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${variants[variant]} ${className}`}
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
  const sizeClasses = {
    sm: 'w-4 h-4 text-xs',
    md: 'w-5 h-5 text-sm',
    lg: 'w-6 h-6 text-base',
  };

  return (
    <span
      className={`inline-flex items-center justify-center rounded-full bg-accent text-accentContrast ${sizeClasses[size]} ${className}`}
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
  if (!level && !title) return null;

  return (
    <span
      className={`relative inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border bg-badgeFill border-badgeBorder text-text pl-4 before:content-[''] before:absolute before:left-2 before:top-1/2 before:-translate-y-1/2 before:h-3 before:w-1 before:rounded-full before:bg-accent/70 ${className}`}
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
    pending: { bg: 'bg-badgeFill', text: 'text-muted', border: 'border-badgeBorder' },
    requested: { bg: 'bg-badgeFill', text: 'text-muted', border: 'border-badgeBorder' },
    scheduled: { bg: 'bg-badgeFill', text: 'text-muted', border: 'border-badgeBorder' },
    active: { bg: 'bg-success/15', text: 'text-text', border: 'border-badgeBorder' },
    in_progress: { bg: 'bg-warning/15', text: 'text-text', border: 'border-badgeBorder' },
    awaiting_payment: { bg: 'bg-warning/15', text: 'text-text', border: 'border-badgeBorder' },
    completed: { bg: 'bg-success/15', text: 'text-text', border: 'border-badgeBorder' },
    cancelled: { bg: 'bg-danger/10', text: 'text-text', border: 'border-badgeBorder' },
    declined: { bg: 'bg-danger/10', text: 'text-text', border: 'border-badgeBorder' },
  };

  const statusConfig = statusColors[status.toLowerCase()] || statusColors.pending;
  const displayStatus = status.replaceAll('_', ' ');

  return (
    <span
      className={`inline-flex items-center h-6 px-2.5 rounded-full border text-[11px] uppercase tracking-wide font-medium ${statusConfig.bg} ${statusConfig.text} ${statusConfig.border} ${className}`}
    >
      {displayStatus}
    </span>
  );
}
