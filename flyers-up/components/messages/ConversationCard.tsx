'use client';

import Link from 'next/link';
import Image from 'next/image';
import { StatusBadge } from './StatusBadge';

export interface ConversationCardItem {
  id: string;
  type: 'booking' | 'conversation';
  bookingId?: string;
  conversationId?: string;
  status: string;
  date: string;
  time: string;
  lastMessage: string;
  lastAt: string | null;
  otherPartyName: string;
  isInquiry: boolean;
  avatarUrl?: string | null;
}

interface ConversationCardProps {
  item: ConversationCardItem;
  href: string;
  unread?: boolean;
}

function getInitial(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return (name[0] ?? '?').toUpperCase();
}

export function ConversationCard({ item, href, unread = false }: ConversationCardProps) {
  const displayStatus = item.isInquiry ? 'inquiry' : item.status;
  const accentBorder = unread ? 'border-l-[3px] border-l-accent' : '';

  return (
    <Link
      href={href}
      className={`block rounded-2xl bg-white dark:bg-[#171A20] border border-[#E5E5E5] dark:border-white/10 shadow-sm hover:shadow-md active:scale-[0.99] transition-all duration-150 focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus:outline-none ${accentBorder} ${unread ? 'shadow-md' : ''}`}
    >
      <div className="flex items-center gap-4 p-4">
        {/* Avatar */}
        <div className="shrink-0 w-11 h-11 rounded-full overflow-hidden bg-gray-100 dark:bg-[#1D2128] flex items-center justify-center">
          {item.avatarUrl ? (
            <Image
              src={item.avatarUrl}
              alt=""
              width={44}
              height={44}
              className="w-full h-full object-cover"
            />
          ) : (
            <span className="text-sm font-semibold text-gray-600 dark:text-[#A1A8B3]">
              {getInitial(item.otherPartyName)}
            </span>
          )}
        </div>

        {/* Center: name, preview */}
        <div className="min-w-0 flex-1">
          <div className="font-semibold text-gray-900 truncate">{item.otherPartyName}</div>
          <div className="text-sm text-[#6B7280] truncate mt-0.5 line-clamp-1">
            {item.lastMessage}
          </div>
        </div>

        {/* Right: time, status badge, chevron */}
        <div className="shrink-0 flex items-center gap-2">
          <div className="flex flex-col items-end">
            <span className="text-xs text-[#6B7280] dark:text-[#A1A8B3] whitespace-nowrap">
              {new Date(item.date).toLocaleDateString(undefined, {
                month: 'short',
                day: 'numeric',
              })}
            </span>
            <StatusBadge status={displayStatus} className="mt-1.5" />
          </div>
          <svg
            className="w-5 h-5 text-[#6B7280] dark:text-[#A1A8B3] shrink-0"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 5l7 7-7 7"
            />
          </svg>
        </div>
      </div>
    </Link>
  );
}
