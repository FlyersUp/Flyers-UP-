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
  // Landing-page discipline:
  // - Keep badges mostly neutral (works in grayscale)
  // - Use role accent only as a small indicator for "active/doing/done" states
  // - Use danger only for negative outcomes
  const s = status.toLowerCase();
  const base = { bg: 'bg-badgeFill', text: 'text-text', border: 'border-badgeBorder' };
  const muted = { bg: 'bg-badgeFill', text: 'text-muted', border: 'border-badgeBorder' };
  const danger = { bg: 'bg-badgeFill', text: 'text-text', border: 'border-badgeBorder', dot: 'before:bg-danger/80' };
  const accent = { bg: 'bg-badgeFill', text: 'text-text', border: 'border-badgeBorder', dot: 'before:bg-accent/80' };

  const statusConfig:
    | ({ bg: string; text: string; border: string } & { dot?: string })
    = (() => {
      if (s === 'pending' || s === 'requested' || s === 'scheduled') return muted;
      if (s === 'cancelled' || s === 'declined') return danger;
      if (s === 'active' || s === 'in_progress' || s === 'awaiting_payment' || s === 'completed') return accent;
      return base;
    })();
  const displayStatus = status.replaceAll('_', ' ');

  return (
    <span
      className={[
        'relative inline-flex items-center h-6 px-2.5 rounded-full border text-[11px] uppercase tracking-wide font-medium',
        statusConfig.bg,
        statusConfig.text,
        statusConfig.border,
        statusConfig.dot ? "pl-4 before:content-[''] before:absolute before:left-2 before:top-1/2 before:-translate-y-1/2 before:h-2 before:w-2 before:rounded-full" : '',
        statusConfig.dot ?? '',
        className,
      ].join(' ')}
    >
      {displayStatus}
    </span>
  );
}
