'use client';

import type { ReactNode } from 'react';
import { AlertCircle } from 'lucide-react';
import { cn } from '@/lib/cn';

export interface AvailabilityAlertCardProps {
  title: string;
  body: string;
  className?: string;
  /** Primary CTA below card */
  action?: ReactNode;
}

/** WEAK supply — soft orange alert (mockup-aligned). */
export function AvailabilityAlertCard({ title, body, className, action }: AvailabilityAlertCardProps) {
  return (
    <div className={cn('space-y-3', className)}>
      <div className="rounded-3xl border border-amber-200/90 bg-[hsl(33_100%_97%)] p-4 shadow-[var(--shadow-sm)]">
        <div className="flex gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-700 ring-1 ring-amber-200/80">
            <AlertCircle className="h-5 w-5" strokeWidth={2} />
          </div>
          <div className="min-w-0">
            <h2 className="text-sm font-bold text-amber-900">{title}</h2>
            <p className="mt-1.5 text-sm leading-relaxed text-amber-950/80">{body}</p>
          </div>
        </div>
      </div>
      {action}
    </div>
  );
}
