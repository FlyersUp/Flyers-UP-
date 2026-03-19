'use client';

/**
 * ErrorPageCard
 * Shared card layout for not-found, error, and global-error pages.
 * Keeps Flyers Up premium UI consistent: soft surfaces, subtle shadows, rounded cards.
 */

import { ReactNode } from 'react';
import { cn } from '@/lib/cn';

export interface ErrorPageCardProps {
  headline: string;
  body: string;
  children: ReactNode;
  className?: string;
}

export function ErrorPageCard({ headline, body, children, className }: ErrorPageCardProps) {
  return (
    <div
      className={cn(
        'rounded-2xl border border-black/10 dark:border-white/10 bg-white dark:bg-[#171A20] shadow-lg p-8 max-w-md w-full',
        'surface-card',
        className
      )}
    >
      <h1 className="text-xl font-semibold text-[#111111] dark:text-[#F5F7FA] tracking-tight">
        {headline}
      </h1>
      <p className="mt-3 text-[#6A6A6A] dark:text-[#A1A8B3] text-[15px] leading-relaxed">
        {body}
      </p>
      <div className="mt-6 flex flex-col gap-3">
        {children}
      </div>
    </div>
  );
}
