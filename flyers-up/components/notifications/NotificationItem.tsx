'use client';

/**
 * Single notification item for the notifications panel.
 * Mobile-first, prevents text overlap, clear typography hierarchy.
 */

import { NotificationIcon } from './NotificationIcon';
import { formatRelativeTime } from '@/lib/formatRelativeTime';

export interface NotificationItemData {
  id: string;
  title: string;
  body: string | null;
  type: string;
  read: boolean;
  read_at: string | null;
  created_at: string;
}

interface NotificationItemProps {
  item: NotificationItemData;
  onClick: () => void;
}

export function NotificationItem({ item, onClick }: NotificationItemProps) {
  const isUnread = !item.read_at && !item.read;

  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full px-4 py-3 text-left hover:bg-surface2/80 transition-colors flex gap-3 items-start min-w-0 ${
        isUnread ? 'bg-surface2/50' : ''
      }`}
    >
      <div className="mt-0.5 shrink-0 text-muted">
        <NotificationIcon type={item.type} size={18} />
      </div>
      <div className="flex-1 min-w-0 overflow-hidden">
        <div
          className={`text-sm truncate ${isUnread ? 'font-semibold' : 'font-normal'} text-text`}
          title={item.title}
        >
          {item.title}
        </div>
        {item.body && (
          <div className="text-xs text-muted line-clamp-2 mt-0.5 break-words">
            {item.body}
          </div>
        )}
        <div className="text-xs text-muted mt-1">
          {formatRelativeTime(item.created_at)}
        </div>
      </div>
      {isUnread && (
        <span className="mt-2 w-2 h-2 rounded-full bg-accent shrink-0 flex-shrink-0" aria-hidden />
      )}
    </button>
  );
}
