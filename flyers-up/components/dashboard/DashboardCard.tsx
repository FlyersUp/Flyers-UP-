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
    <div className="rounded-2xl bg-[#F5F5F5]/60 animate-pulse border border-black/5 shadow-sm h-32" />
  );
}
