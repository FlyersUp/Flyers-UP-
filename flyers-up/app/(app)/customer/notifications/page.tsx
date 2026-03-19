'use client';

import { AppLayout } from '@/components/layouts/AppLayout';
import Link from 'next/link';
import { useEffect } from 'react';
import { useNavAlerts } from '@/contexts/NavAlertsContext';
import { useUnreadNotifications } from '@/hooks/useUnreadNotifications';
import { NotificationList } from '@/components/notifications/NotificationList';

/**
 * Customer Notifications - Durable list with unread styling, timestamps, deep links.
 * Marks all as read once when page becomes visible.
 */
export default function CustomerNotifications() {
  const { clearMessagesAlert } = useNavAlerts();
  const { markAllRead, error } = useUnreadNotifications();

  useEffect(() => {
    clearMessagesAlert();
  }, [clearMessagesAlert]);

  return (
    <AppLayout mode="customer">
      <div className="max-w-4xl mx-auto px-4 py-6">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h1 className="text-2xl font-semibold text-text tracking-[0.2px]">Notifications</h1>
          <button
            type="button"
            onClick={() => void markAllRead()}
            className="rounded-full border border-border bg-surface px-3 py-1.5 text-xs font-medium text-muted hover:text-text"
          >
            Mark all read
          </button>
        </div>

        {error && (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900/40 dark:bg-red-950/20 dark:text-red-300">
            {error}
          </div>
        )}

        <NotificationList basePath="/customer" />

        <div className="mt-6">
          <Link href="/occupations" className="text-sm font-medium text-text hover:underline">
            Browse occupations →
          </Link>
        </div>
      </div>
    </AppLayout>
  );
}
