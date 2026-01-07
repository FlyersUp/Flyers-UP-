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
          <h1 className="font-semibold text-gray-900 text-xl">Notifications</h1>
          <button className="text-sm text-teal-600 hover:text-teal-700 font-medium">
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
                ? 'bg-teal-600 text-white'
                : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'
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
                ? 'bg-teal-600 text-white'
                : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'
              }
            `}
          >
            Unread
            {unreadCount > 0 && (
              <span className={`
                px-1.5 py-0.5 rounded-full text-xs
                ${filter === 'unread' ? 'bg-white/20' : 'bg-teal-100 text-teal-700'}
              `}>
                {unreadCount}
              </span>
            )}
          </button>
        </div>

        {/* Notifications list */}
        {notifications.length > 0 ? (
          <div className="space-y-3">
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
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-4xl">🔔</span>
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              {filter === 'unread' ? 'No unread notifications' : 'No notifications yet'}
            </h2>
            <p className="text-gray-500">
              {filter === 'unread' 
                ? 'You\'re all caught up!'
                : 'Job updates and alerts will appear here.'
              }
            </p>
          </div>
        )}

        {/* Notification settings link */}
        <div className="mt-8 pt-8 border-t border-gray-200 text-center">
          <button className="text-sm text-gray-500 hover:text-gray-700 transition-colors">
            Notification Settings
          </button>
        </div>
      </div>
    </PageLayout>
  );
}




