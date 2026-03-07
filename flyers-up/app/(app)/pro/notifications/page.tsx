'use client';

import { AppLayout } from '@/components/layouts/AppLayout';
import Link from 'next/link';
import { useEffect, useRef } from 'react';
import { useNavAlerts } from '@/contexts/NavAlertsContext';
import { useUnreadNotifications } from '@/hooks/useUnreadNotifications';
import { NotificationList } from '@/components/notifications/NotificationList';

/**
 * Pro Notifications - Durable list with unread styling, timestamps, deep links.
 * Marks all as read once when page becomes visible.
 */
export default function ProNotifications() {
  const { clearMessagesAlert } = useNavAlerts();
  const { markAllRead, error } = useUnreadNotifications();
  const hasMarkedRead = useRef(false);

  useEffect(() => {
    clearMessagesAlert();
  }, [clearMessagesAlert]);

  useEffect(() => {
    if (hasMarkedRead.current) return;
    hasMarkedRead.current = true;
    void markAllRead();
  }, [markAllRead]);

  return (
    <AppLayout mode="pro">
      <div className="max-w-4xl mx-auto px-4 py-6">
        <h1 className="text-2xl font-semibold text-[#2C2C2C] tracking-[0.2px] mb-6">
          Notifications
        </h1>

        {error && (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            {error}
          </div>
        )}

        <NotificationList basePath="/pro" />

        <div className="mt-6">
          <Link href="/pro/jobs" className="text-sm font-medium text-text hover:underline">
            Go to requests →
          </Link>
        </div>
      </div>
    </AppLayout>
  );
}
