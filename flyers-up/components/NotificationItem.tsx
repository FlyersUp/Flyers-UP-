/**
 * Notification Item Component
 * Single notification card with status icon
 */

import Link from 'next/link';
import type { Notification } from '@/lib/mockData';

interface NotificationItemProps {
  notification: Notification;
  className?: string;
}

const typeConfig: Record<string, { icon: string; accentColor: string; bgColor: string }> = {
  booking: { icon: '📅', accentColor: 'border-l-blue-500', bgColor: 'bg-blue-50' },
  payment: { icon: '💳', accentColor: 'border-l-green-500', bgColor: 'bg-green-50' },
  status: { icon: '🚗', accentColor: 'border-l-orange-500', bgColor: 'bg-orange-50' },
  promo: { icon: '🎉', accentColor: 'border-l-purple-500', bgColor: 'bg-purple-50' },
  review: { icon: '⭐', accentColor: 'border-l-amber-500', bgColor: 'bg-amber-50' },
  system: { icon: '⚙️', accentColor: 'border-l-gray-500', bgColor: 'bg-gray-50' },
  message: { icon: '💬', accentColor: 'border-l-teal-500', bgColor: 'bg-teal-50' },
};

export default function NotificationItem({ notification, className = '' }: NotificationItemProps) {
  // Get config with fallback for unknown types
  const config = typeConfig[notification.type] || {
    icon: '🔔',
    accentColor: 'border-l-gray-500',
    bgColor: 'bg-gray-50',
  };
  
  // Use time from notification if available, otherwise format timestamp
  let timeLabel = '';
  if ('time' in notification && notification.time) {
    timeLabel = notification.time;
  } else if ('timestamp' in notification && notification.timestamp) {
    const timestamp = new Date(notification.timestamp);
    const now = new Date();
    const diffMs = now.getTime() - timestamp.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) timeLabel = 'Just now';
    else if (diffMins < 60) timeLabel = `${diffMins}m ago`;
    else if (diffHours < 24) timeLabel = `${diffHours}h ago`;
    else if (diffDays < 7) timeLabel = `${diffDays}d ago`;
    else timeLabel = timestamp.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }

  const content = (
    <div 
      className={`
        relative p-4 bg-white rounded-xl border-l-4 shadow-sm
        transition-all hover:shadow-md
        ${config.accentColor}
        ${!notification.read ? 'ring-1 ring-teal-100' : ''}
        ${className}
      `}
    >
      {/* Unread indicator */}
      {!notification.read && (
        <span className="absolute top-4 right-4 w-2 h-2 bg-teal-500 rounded-full" />
      )}

      <div className="flex items-start gap-3">
        {/* Icon */}
        <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${config.bgColor}`}>
          <span className="text-lg">{config.icon}</span>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h4 className={`font-medium ${notification.read ? 'text-gray-700' : 'text-gray-900'}`}>
              {notification.title}
            </h4>
            <span className="text-xs text-gray-500 flex-shrink-0">{timeLabel}</span>
          </div>
          <p className={`text-sm mt-0.5 ${notification.read ? 'text-gray-500' : 'text-gray-600'}`}>
            {'message' in notification ? notification.message : 'description' in notification ? notification.description : ''}
          </p>
        </div>
      </div>
    </div>
  );

  // Wrap in link if has jobId
  if (notification.jobId) {
    return (
      <Link href={`/jobs/${notification.jobId}`} className="block">
        {content}
      </Link>
    );
  }

  return content;
}




