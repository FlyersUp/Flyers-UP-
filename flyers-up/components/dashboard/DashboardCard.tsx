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
      className={cn('transition-all duration-200 hover:shadow-md hover:-translate-y-0.5', className)}
      padding="md"
    >
      {children}
    </Card>
  );
}

export function DashboardSectionSkeleton() {
  return (
    <div className="rounded-2xl bg-gray-200 dark:bg-gray-700 animate-pulse border border-gray-200 dark:border-white/10 shadow-sm h-32" />
  );
}
