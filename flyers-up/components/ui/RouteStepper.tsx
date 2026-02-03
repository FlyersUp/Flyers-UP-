import React from 'react';

export interface RouteStep {
  key: string;
  label: string;
  caption?: string;
}

export interface RouteStepperProps {
  steps: RouteStep[];
  currentIndex: number;
  className?: string;
}

/**
 * Civic "route diagram" stepper (wayfinding): stops + connecting line.
 */
export function RouteStepper({ steps, currentIndex, className = '' }: RouteStepperProps) {
  return (
    <div className={['rounded-xl border border-border bg-surface px-4 py-3', className].join(' ')}>
      <ol className="relative grid gap-3">
        {steps.map((step, idx) => {
          const isDone = idx < currentIndex;
          const isCurrent = idx === currentIndex;

          return (
            <li key={step.key} className="relative flex items-start gap-3">
              {/* connector */}
              {idx !== steps.length - 1 ? (
                <span
                  aria-hidden
                  className="absolute left-[10px] top-6 h-[calc(100%-12px)] w-px bg-border"
                />
              ) : null}

              {/* stop */}
              <span
                aria-hidden
                className={[
                  'mt-0.5 grid h-5 w-5 place-items-center rounded-full border',
                  isDone ? 'bg-success border-success/40' : 'bg-surface border-border/70',
                  isCurrent ? 'ring-2 ring-accent/35 ring-offset-2 ring-offset-surface' : '',
                ].join(' ')}
              >
                <span className={['h-2 w-2 rounded-full', isDone ? 'bg-surface' : 'bg-border/70'].join(' ')} />
              </span>

              {/* text */}
              <div className="min-w-0">
                <div className={['text-sm font-medium', isCurrent ? 'text-text' : 'text-muted'].join(' ')}>
                  {step.label}
                </div>
                {step.caption ? (
                  <div className="text-xs text-muted/70 leading-relaxed">{step.caption}</div>
                ) : null}
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

