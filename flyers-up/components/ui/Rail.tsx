'use client';

import { useTheme } from '@/contexts/ThemeContext';

interface RailProps {
  className?: string;
  showLabel?: boolean;
  label?: string;
}

/**
 * White vertical rail with thin colored stripe
 * Core 3% rule design element
 */
export function Rail({ className = '', showLabel = false, label }: RailProps) {
  const { mode } = useTheme();
  const displayLabel = label || (mode === 'customer' ? 'CUSTOMER MODE' : 'PRO MODE');

  return (
    <div
      className={`relative w-px shrink-0 overflow-hidden bg-bg sm:w-[4px] sm:border-r sm:border-border ${className}`}
      aria-hidden
    >
      {/* Accent stripe: hairline on phones, full rail on sm+ */}
      <div className="absolute left-0 top-0 bottom-0 w-px bg-accent" />
      {/* Optional micro-label — desktop/tablet only (avoids clutter + overflow on narrow viewports) */}
      {showLabel && (
        <div
          className="absolute top-4 left-1/2 hidden -translate-x-1/2 rotate-90 origin-center whitespace-nowrap sm:block"
          style={{ fontSize: '8px', fontFamily: 'var(--font-oswald)' }}
        >
          <span className="text-muted">{displayLabel}</span>
        </div>
      )}
    </div>
  );
}












