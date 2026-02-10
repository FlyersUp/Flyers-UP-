import React from 'react';

type PlacardTone = 'neutral' | 'primary' | 'success' | 'warning' | 'info' | 'danger';

export interface PlacardHeaderProps {
  title: string;
  subtitle?: string;
  tone?: PlacardTone;
  right?: React.ReactNode;
  className?: string;
}

function toneClasses(tone: PlacardTone) {
  switch (tone) {
    case 'primary':
      return 'border-l-accent/50';
    case 'success':
    case 'warning':
    case 'info':
      // Keep landing-page discipline: reserve non-role colors for true errors only.
      // Use role accent for positive/attention/info section markers.
      return 'border-l-accent/50';
    case 'danger':
      return 'border-l-danger/50';
    case 'neutral':
    default:
      return 'border-l-border/70';
  }
}

/**
 * Civic "placard" section header: thin linework + warm panel surface.
 * Use for page sections like "What happens next", "Pricing", "Availability".
 */
export function PlacardHeader({
  title,
  subtitle,
  tone = 'neutral',
  right,
  className = '',
}: PlacardHeaderProps) {
  return (
    <div
      className={[
        'flex items-start justify-between gap-3',
        'bg-surface2 border border-[var(--surface-border)] border-l-[3px]',
        toneClasses(tone),
        'rounded-[16px] px-4 py-3 shadow-card',
        className,
      ].join(' ')}
    >
      <div className="min-w-0">
        <div className="text-sm font-semibold text-text">{title}</div>
        {subtitle ? (
          <div className="mt-0.5 text-xs text-muted leading-relaxed">{subtitle}</div>
        ) : null}
      </div>
      {right ? <div className="shrink-0">{right}</div> : null}
    </div>
  );
}

