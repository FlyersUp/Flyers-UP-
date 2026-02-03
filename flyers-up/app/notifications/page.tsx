'use client';

/**
 * Notifications Page
 * Job alerts and activity feed
 */

import { useState } from 'react';
import Link from 'next/link';
import NotificationItem from '@/components/NotificationItem';
import PageLayout from '@/components/PageLayout';
import { MOCK_NOTIFICATIONS } from '@/lib/mockData';

export default function NotificationsPage() {
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  
  const notifications = filter === 'unread' 
    ? MOCK_NOTIFICATIONS.filter(n => !n.read)
    : MOCK_NOTIFICATIONS;

  const unreadCount = MOCK_NOTIFICATIONS.filter(n => !n.read).length;

  return (
    <PageLayout showBackButton>
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <h1 className="font-semibold text-text text-xl">Notifications</h1>
          <button className="text-sm text-accent hover:opacity-80 font-medium transition-opacity">
            Mark all read
          </button>
        </div>
      </div>

      {/* Main content */}
      <div>
        {/* Filter tabs */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setFilter('all')}
            className={`
              px-4 py-2 rounded-full text-sm font-medium transition-colors
              ${filter === 'all'
                ? 'bg-accent text-accentContrast'
                : 'bg-surface border border-border text-text hover:bg-surface2'
              }
            `}
          >
            All
          </button>
          <button
            onClick={() => setFilter('unread')}
            className={`
              px-4 py-2 rounded-full text-sm font-medium transition-colors flex items-center gap-2
              ${filter === 'unread'
                ? 'bg-accent text-accentContrast'
                : 'bg-surface border border-border text-text hover:bg-surface2'
              }
            `}
          >
            Unread
            {unreadCount > 0 && (
              <span className={`
                px-1.5 py-0.5 rounded-full text-xs
                ${filter === 'unread' ? 'bg-surface/20' : 'bg-accent/15 text-text'}
              `}>
                {unreadCount}
              </span>
            )}
          </button>
        </div>

        {/* Notifications list */}
        {notifications.length > 0 ? (
          <div className="space-y-4">
            {notifications.map((notification, index) => (
              <div 
                key={notification.id}
                className="animate-fade-in"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <NotificationItem notification={notification} />
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <div className="w-20 h-20 bg-surface2 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-4xl">🔔</span>
            </div>
            <h2 className="text-xl font-semibold text-text mb-2">
              {filter === 'unread' ? 'No unread notifications' : 'No notifications yet'}
            </h2>
            <p className="text-muted/70">
              {filter === 'unread' 
                ? 'You\'re all caught up!'
                : 'Job updates and alerts will appear here.'
              }
            </p>
          </div>
        )}

        {/* Notification settings link */}
        <div className="mt-10 pt-10 border-t border-hairline text-center">
          <button className="text-sm text-muted/70 hover:text-text transition-colors">
            Notification Settings
          </button>
        </div>
      </div>
    </PageLayout>
  );
}




