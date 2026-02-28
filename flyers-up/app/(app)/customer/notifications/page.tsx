'use client';

import { AppLayout } from '@/components/layouts/AppLayout';
import Link from 'next/link';
import { useEffect } from 'react';
import { useNavAlerts } from '@/contexts/NavAlertsContext';
import { NotificationList } from '@/components/notifications/NotificationList';

/**
 * Customer Notifications - Durable list with unread styling, timestamps, deep links
 */
export default function CustomerNotifications() {
  const { clearMessagesAlert } = useNavAlerts();

  useEffect(() => {
    clearMessagesAlert();
  }, [clearMessagesAlert]);

  return (
    <AppLayout mode="customer">
      <div className="max-w-4xl mx-auto px-4 py-6">
        <h1 className="text-2xl font-semibold text-[#2C2C2C] tracking-[0.2px] mb-6">
          Notifications
        </h1>

        <NotificationList basePath="/customer" />

        <div className="mt-6">
          <Link href="/services" className="text-sm font-medium text-text hover:underline">
            Browse services →
          </Link>
        </div>
      </div>
    </AppLayout>
  );
}
