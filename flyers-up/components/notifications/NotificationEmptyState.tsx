'use client';

/**
 * Empty state for a notification section.
 * Mobile-first, on-brand for Flyers Up.
 */

import Link from 'next/link';

interface NotificationEmptyStateProps {
  title: string;
  description: string;
  actionLabel?: string;
  actionHref?: string;
  onActionClick?: () => void;
}

export function NotificationEmptyState({
  title,
  description,
  actionLabel,
  actionHref,
  onActionClick,
}: NotificationEmptyStateProps) {
  return (
    <div className="px-4 py-6 text-center">
      <p className="text-sm font-medium text-text">{title}</p>
      <p className="text-xs text-muted mt-1">{description}</p>
      {actionLabel && actionHref && (
        <Link
          href={actionHref}
          onClick={onActionClick}
          className="mt-3 inline-block text-sm font-medium text-accent hover:underline"
        >
          {actionLabel}
        </Link>
      )}
    </div>
  );
}
