'use client';

import { ReactNode } from 'react';

/**
 * Premium settings card: paper bg, rounded-2xl, border-black/5, shadow-sm.
 */
interface SettingsCardProps {
  children: ReactNode;
  className?: string;
}

export function SettingsCard({ children, className = '' }: SettingsCardProps) {
  return (
    <div
      className={`rounded-2xl border border-black/5 bg-white shadow-sm p-5 ${className}`}
      style={{ backgroundColor: '#FFFFFF' }}
    >
      {children}
    </div>
  );
}
