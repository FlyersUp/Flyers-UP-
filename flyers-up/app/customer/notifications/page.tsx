'use client';

import { AppLayout } from '@/components/layouts/AppLayout';
import { Label } from '@/components/ui/Label';
import { mockNotifications } from '@/lib/mockData';

/**
 * Customer Notifications - Screen 11
 * List of notifications with icons and timestamps
 */
export default function CustomerNotifications() {
  const getIcon = (type: string) => {
    switch (type) {
      case 'booking': return '📅';
      case 'payment': return '💳';
      case 'message': return '💬';
      default: return '🔔';
    }
  };

  return (
    <AppLayout mode="customer">
      <div className="max-w-4xl mx-auto px-4 py-6">
        <h1 className="text-2xl font-semibold text-text mb-6">
          Notifications
        </h1>

        <div className="space-y-4">
          {mockNotifications.map((notif) => (
            <div
              key={notif.id}
              className={`surface-card p-5 flex items-start gap-4 ${
                !notif.read ? 'border-l-[3px] border-l-accent' : ''
              }`}
            >
              <div className="text-2xl">{getIcon(notif.type)}</div>
              <div className="flex-1">
                <div className="font-semibold text-text mb-1">
                  {notif.title}
                </div>
                <p className="text-sm text-muted mb-1">{notif.message}</p>
                <div className="text-xs text-muted/70">{notif.time}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </AppLayout>
  );
}












