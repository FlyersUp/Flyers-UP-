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

// Landing-page discipline:
// - Keep notifications mostly neutral (works in grayscale)
// - Use role accent only as a micro indicator (rail + unread dot)
// - Avoid extra palette (no blue/green/yellow fills)
const typeConfig: Record<string, { icon: string; accentColor: string; bgColor: string }> = {
  booking: { icon: '📅', accentColor: 'border-l-accent', bgColor: 'bg-surface2' },
  payment: { icon: '💳', accentColor: 'border-l-accent', bgColor: 'bg-surface2' },
  status: { icon: '🚗', accentColor: 'border-l-accent', bgColor: 'bg-surface2' },
  promo: { icon: '🎉', accentColor: 'border-l-accent', bgColor: 'bg-surface2' },
  review: { icon: '⭐', accentColor: 'border-l-accent', bgColor: 'bg-surface2' },
  system: { icon: '⚙️', accentColor: 'border-l-border', bgColor: 'bg-surface2' },
  message: { icon: '💬', accentColor: 'border-l-accent', bgColor: 'bg-surface2' },
};

export default function NotificationItem({ notification, className = '' }: NotificationItemProps) {
  // Get config with fallback for unknown types
  const config = typeConfig[notification.type] || {
    icon: '🔔',
    accentColor: 'border-l-border',
    bgColor: 'bg-surface2',
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
        relative p-5 surface-card border-l-[3px]
        card-hover
        ${config.accentColor}
        ${className}
      `}
    >
      {/* Unread indicator */}
      {!notification.read && (
        <span className="absolute top-4 right-4 w-2 h-2 bg-accent rounded-full" />
      )}

      <div className="flex items-start gap-3">
        {/* Icon */}
        <div
          className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center border border-hairline ${config.bgColor}`}
        >
          <span className="text-lg">{config.icon}</span>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h4 className={`font-medium ${notification.read ? 'text-text' : 'text-text'}`}>
              {notification.title}
            </h4>
            <span className="text-xs text-muted/70 flex-shrink-0">{timeLabel}</span>
          </div>
          <p className={`text-sm mt-0.5 ${notification.read ? 'text-muted/70' : 'text-muted'}`}>
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




