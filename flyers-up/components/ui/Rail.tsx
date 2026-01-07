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
  const { mode, primaryColor } = useTheme();
  const displayLabel = label || (mode === 'customer' ? 'CUSTOMER MODE' : 'PRO MODE');

  return (
    <div 
      className={`relative w-1 bg-white ${className}`}
      style={{ width: '4px' }}
    >
      {/* Thin colored stripe */}
      <div
        className="absolute left-0 top-0 bottom-0"
        style={{
          width: '1px',
          backgroundColor: primaryColor,
        }}
      />
      
      {/* Optional micro-label */}
      {showLabel && (
        <div 
          className="absolute top-4 left-1/2 transform -translate-x-1/2 rotate-90 origin-center whitespace-nowrap"
          style={{ fontSize: '8px', color: '#94a3b8', fontFamily: 'var(--font-oswald)' }}
        >
          {displayLabel}
        </div>
      )}
    </div>
  );
}









