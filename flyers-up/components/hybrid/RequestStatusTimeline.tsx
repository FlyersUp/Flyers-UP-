'use client';

import { Check, Handshake, Search } from 'lucide-react';
import type { RequestTimelineStep } from '@/lib/hybrid-ui/types';
import { cn } from '@/lib/cn';

export interface RequestStatusTimelineProps {
  steps: RequestTimelineStep[];
  className?: string;
}

function StepIcon({ state }: { state: RequestTimelineStep['state'] }) {
  if (state === 'complete') {
    return (
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500 text-white shadow-sm ring-4 ring-emerald-100">
        <Check className="h-5 w-5" strokeWidth={2.5} />
      </div>
    );
  }
  if (state === 'active') {
    return (
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[hsl(var(--trust))] text-white shadow-[0_0_0_4px_rgba(74,105,189,0.25)]">
        <Search className="h-5 w-5" strokeWidth={2} />
      </div>
    );
  }
  return (
    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-surface2 text-text-3 ring-1 ring-border">
      <Handshake className="h-5 w-5 opacity-60" strokeWidth={2} />
    </div>
  );
}

export function RequestStatusTimeline({ steps, className }: RequestStatusTimelineProps) {
  return (
    <ol className={cn('relative space-y-0 pl-1', className)}>
      {steps.map((step, i) => {
        const isLast = i === steps.length - 1;
        const muted = step.state === 'pending';
        return (
          <li key={step.id} className="relative flex gap-4 pb-8 last:pb-0">
            {!isLast ? (
              <span
                className="absolute left-[19px] top-10 h-[calc(100%-0.5rem)] w-px bg-border"
                aria-hidden
              />
            ) : null}
            <div className="relative z-[1] shrink-0">
              <StepIcon state={step.state} />
            </div>
            <div className={cn('min-w-0 pt-0.5', muted && 'opacity-60')}>
              <p
                className={cn(
                  'text-sm font-bold',
                  step.state === 'active' && 'text-[hsl(var(--trust))]',
                  step.state === 'complete' && 'text-text',
                  step.state === 'pending' && 'text-text-3'
                )}
              >
                {step.title}
              </p>
              <p className={cn('mt-1 text-xs leading-relaxed', muted ? 'text-text-3' : 'text-text-3')}>{step.description}</p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
