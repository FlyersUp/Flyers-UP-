'use client';

/**
 * Notifications panel container.
 * Mobile-first, constrained height, clean structure.
 * Sections: Today's Jobs, Requests Near You (This Week), Earlier.
 */

import { ReactNode } from 'react';

interface NotificationsPanelProps {
  header: ReactNode;
  children: ReactNode;
  footer: ReactNode;
  /** Max height for scrollable content (mobile-first) */
  maxHeight?: string;
}

export function NotificationsPanel({
  header,
  children,
  footer,
  maxHeight = 'min(400px, 60vh)',
}: NotificationsPanelProps) {
  return (
    <div
      className="flex flex-col rounded-2xl border border-border bg-surface shadow-xl overflow-hidden w-full"
      style={{ maxHeight: 'min(500px, 70vh)' }}
    >
      <div className="shrink-0 border-b border-border">{header}</div>
      <div
        className="overflow-y-auto overscroll-contain flex-1 min-h-0"
        style={{ maxHeight }}
      >
        {children}
      </div>
      <div className="shrink-0 border-t border-border">{footer}</div>
    </div>
  );
}
