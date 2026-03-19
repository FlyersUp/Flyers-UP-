'use client';

/**
 * Report Issue Button
 * Opens the ReportIssueModal. Use on error pages, not-found, global-error.
 * Pass optional context (error message, digest, stack) for richer reports.
 */

import { useState } from 'react';
import { AlertCircle } from 'lucide-react';
import { ReportIssueModal, type ReportIssueContext } from './ReportIssueModal';
import { cn } from '@/lib/cn';

export interface ReportIssueButtonProps {
  /** Optional context from error boundary */
  context?: ReportIssueContext | null;
  /** Button variant */
  variant?: 'primary' | 'secondary' | 'ghost';
  /** Optional class */
  className?: string;
  /** Button label */
  children?: React.ReactNode;
}

export function ReportIssueButton({
  context,
  variant = 'secondary',
  className,
  children = 'Report Issue',
}: ReportIssueButtonProps) {
  const [open, setOpen] = useState(false);

  const baseClasses = 'inline-flex items-center justify-center gap-2 h-11 px-5 rounded-full text-sm font-semibold transition-all focus:outline-none focus:ring-2 focus:ring-accent/50 focus:ring-offset-2';

  const variantClasses = {
    primary: 'bg-accent text-accentContrast hover:opacity-95',
    secondary: 'border border-black/15 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/5',
    ghost: 'hover:bg-black/5 dark:hover:bg-white/5 text-[#6A6A6A] dark:text-[#A1A8B3]',
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(baseClasses, variantClasses[variant], className)}
      >
        <AlertCircle size={18} strokeWidth={2} />
        {children}
      </button>
      <ReportIssueModal
        open={open}
        onClose={() => setOpen(false)}
        context={context}
        variant="modal"
      />
    </>
  );
}
