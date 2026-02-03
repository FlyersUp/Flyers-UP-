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
    <div className={`relative w-[4px] bg-surface ${className}`}>
      {/* Thin colored stripe */}
      <div className="absolute left-0 top-0 bottom-0 w-px bg-accent" />
      
      {/* Optional micro-label */}
      {showLabel && (
        <div 
          className="absolute top-4 left-1/2 transform -translate-x-1/2 rotate-90 origin-center whitespace-nowrap"
          style={{ fontSize: '8px', fontFamily: 'var(--font-oswald)' }}
        >
          <span className="text-muted/70">{displayLabel}</span>
        </div>
      )}
    </div>
  );
}












