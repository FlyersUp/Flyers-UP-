'use client';

/**
 * Section wrapper for grouped notifications.
 * Clear separation, consistent spacing, typography hierarchy.
 */

import { ReactNode } from 'react';

interface NotificationSectionProps {
  title: string;
  children: ReactNode;
}

export function NotificationSection({ title, children }: NotificationSectionProps) {
  return (
    <section className="border-b border-border last:border-b-0">
      <h3 className="px-4 py-2.5 text-xs font-semibold text-muted uppercase tracking-wider">
        {title}
      </h3>
      {children}
    </section>
  );
}
