'use client';

import { ReactNode } from 'react';
import { Card } from '@/components/ui/Card';

/**
 * Premium settings card: uses shared Card component.
 */
interface SettingsCardProps {
  children: ReactNode;
  className?: string;
}

export function SettingsCard({ children, className = '' }: SettingsCardProps) {
  return (
    <Card className={className} padding="lg">
      {children}
    </Card>
  );
}
