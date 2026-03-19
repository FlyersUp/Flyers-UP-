'use client';

import { ReactNode } from 'react';
import { Card } from '@/components/ui/Card';
import { cn } from '@/lib/cn';

interface DashboardCardProps {
  children: ReactNode;
  className?: string;
}

export function DashboardCard({ children, className = '' }: DashboardCardProps) {
  return (
    <Card
      className={cn('transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[var(--shadow-card-hover)]', className)}
      padding="md"
    >
      {children}
    </Card>
  );
}

export function DashboardSectionSkeleton() {
  return (
    <div className="h-32 animate-pulse rounded-2xl border border-border bg-surface2/75 shadow-[var(--shadow-1)]" />
  );
}
