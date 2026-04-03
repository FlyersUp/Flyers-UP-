'use client';

import type { ReactNode } from 'react';
import { ShieldCheck } from 'lucide-react';
import { cn } from '@/lib/cn';

const base =
  'inline-flex items-center gap-1 rounded-full border text-xs font-semibold leading-none transition-colors';

export type BadgeVariant =
  | 'default'
  | 'verified'
  | 'info'
  | 'neutral'
  | 'warning'
  | 'success'
  | 'featured'
  | 'new'
  | 'highlight';

const variantClasses: Record<BadgeVariant, string> = {
  default: 'border-badgeBorder bg-badgeFill px-2.5 py-1 text-text2',
  verified:
    'border-[hsl(var(--action)/0.35)] bg-[hsl(var(--action)/0.18)] px-2.5 py-1 text-text',
  info: 'border-trust/25 bg-trust/10 px-2.5 py-1 text-trust',
  neutral: 'border-border bg-surface2 px-2.5 py-1 text-text2',
  warning: 'border-[hsl(var(--warning)/0.4)] bg-[hsl(var(--warning)/0.14)] px-2.5 py-1 text-text',
  success: 'border-success/35 bg-success/15 px-2.5 py-1 text-text',
  featured:
    'border-trust/30 bg-trust/8 px-2.5 py-1 text-text ring-1 ring-[hsl(var(--action)/0.15)]',
  new: 'border-sage/35 bg-sage/15 px-2.5 py-1 text-text',
  highlight:
    "relative border-[hsl(var(--action)/0.35)] bg-[hsl(var(--action)/0.14)] pl-4 pr-2.5 py-1 text-text before:absolute before:left-2 before:top-1/2 before:h-3 before:w-1 before:-translate-y-1/2 before:rounded-full before:bg-accentOrange/85",
};

interface BadgeProps {
  children: ReactNode;
  variant?: BadgeVariant;
  className?: string;
}

/**
 * Compact capsule badge — Flyers Up trust / action / teal system.
 */
export function Badge({ children, variant = 'default', className = '' }: BadgeProps) {
  return (
    <span className={cn(base, variantClasses[variant], className)}>
      {children}
    </span>
  );
}

export default Badge;

interface VerifiedBadgeProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function VerifiedBadge({ size = 'sm', className = '' }: VerifiedBadgeProps) {
  const sizeClasses = {
    sm: 'h-4 w-4 text-[10px]',
    md: 'h-5 w-5 text-xs',
    lg: 'h-6 w-6 text-sm',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center justify-center rounded-full bg-success text-successFg shadow-sm',
        sizeClasses[size],
        className
      )}
      aria-label="Verified"
    >
      ✓
    </span>
  );
}

interface LevelBadgeProps {
  level?: string | number;
  title?: string;
  className?: string;
}

export function LevelBadge({ level, title, className = '' }: LevelBadgeProps) {
  if (!level && !title) return null;

  return (
    <span
      className={cn(
        'relative inline-flex items-center border border-badgeBorder bg-badgeFill pl-4 pr-2.5 py-1 text-xs font-medium text-text',
        "before:absolute before:left-2 before:top-1/2 before:h-3 before:w-1 before:-translate-y-1/2 before:rounded-full before:bg-trust/70",
        className
      )}
    >
      {title || `Level ${level}`}
    </span>
  );
}

interface StatusBadgeProps {
  status: string;
  className?: string;
}

export function StatusBadge({ status, className = '' }: StatusBadgeProps) {
  const s = status.toLowerCase();
  const basePill =
    'relative inline-flex h-6 items-center rounded-full border px-2.5 text-[11px] font-semibold uppercase tracking-wide';
  const isMuted = s === 'pending' || s === 'requested' || s === 'scheduled';
  const isDanger = s === 'cancelled' || s === 'declined';
  const isAccent =
    s === 'active' ||
    s === 'in_progress' ||
    s === 'awaiting_payment' ||
    s === 'completed';
  const dot =
    isDanger || isAccent
      ? "pl-4 before:absolute before:left-2 before:top-1/2 before:h-2 before:w-2 before:-translate-y-1/2 before:rounded-full before:content-['']"
      : '';
  const dotColor = isDanger ? 'before:bg-danger/80' : isAccent ? 'before:bg-action/85' : '';

  const surface = isMuted
    ? 'border-border bg-badgeFill text-muted'
    : 'border-border bg-surface2 text-text';

  const displayStatus = status.replaceAll('_', ' ');

  return (
    <span className={cn(basePill, surface, dot, dotColor, className)}>
      {displayStatus}
    </span>
  );
}

/** Verified pro / listing badge with icon */
export function VerifiedProBadge({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border border-[hsl(var(--action)/0.35)] bg-[hsl(var(--action)/0.16)] px-2 py-0.5 text-[11px] font-bold text-text',
        className
      )}
    >
      <ShieldCheck className="h-3.5 w-3.5 text-action" strokeWidth={2.25} aria-hidden />
      Verified
    </span>
  );
}
