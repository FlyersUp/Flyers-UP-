'use client';

import { ReactNode } from 'react';

const CARD_BASE =
  'rounded-xl bg-[#F2F2F0] border border-black/8 transition-all duration-200 hover:shadow-md hover:-translate-y-0.5';
const CARD_SHADOW = { boxShadow: '0 2px 8px rgba(0,0,0,0.06), inset 0 1px 0 rgba(255,255,255,0.5)' };

interface DashboardCardProps {
  children: ReactNode;
  className?: string;
}

export function DashboardCard({ children, className = '' }: DashboardCardProps) {
  return (
    <div className={`${CARD_BASE} ${className}`} style={CARD_SHADOW}>
      {children}
    </div>
  );
}

export function DashboardSectionSkeleton() {
  return (
    <div className="rounded-xl bg-[#F2F2F0]/60 animate-pulse border border-black/8 h-32" />
  );
}
