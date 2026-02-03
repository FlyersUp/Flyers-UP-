'use client';

import { AppLayout } from '@/components/layouts/AppLayout';
import { Label } from '@/components/ui/Label';
import { mockNotifications } from '@/lib/mockData';

/**
 * Pro Notifications - Screen 20
 * Notifications focused on bookings, job changes, payouts
 */
export default function ProNotifications() {
  const proNotifications = [
    {
      id: '1',
      type: 'booking',
      title: 'New booking request',
      message: 'John Doe requested Deep Clean for Jan 15',
      time: '2 hours ago',
      read: false,
    },
    {
      id: '2',
      type: 'payment',
      title: 'Payment received',
      message: '$150 from Standard Clean job',
      time: '1 day ago',
      read: true,
    },
    {
      id: '3',
      type: 'job',
      title: 'Job status updated',
      message: 'Customer marked job as completed',
      time: '2 days ago',
      read: true,
    },
  ];

  const getIcon = (type: string) => {
    switch (type) {
      case 'booking': return '📅';
      case 'payment': return '💳';
      case 'job': return '🔧';
      default: return '🔔';
    }
  };

  return (
    <AppLayout mode="pro">
      <div className="max-w-4xl mx-auto px-4 py-6">
        <h1 className="text-2xl font-semibold text-text mb-6">
          Notifications
        </h1>

        <div className="space-y-4">
          {proNotifications.map((notif) => (
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












