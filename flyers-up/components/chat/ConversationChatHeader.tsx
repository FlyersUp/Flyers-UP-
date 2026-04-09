'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';

export interface ConversationChatHeaderProps {
  proName: string;
  proAvatarUrl?: string | null;
  /** Optional booking context — e.g. "March 25 • 2:00 PM" or "Lawn care • Mar 25" */
  bookingContext?: string | null;
  /** Link to view booking when available */
  bookingHref?: string | null;
  /** True when conversation has no linked booking (inquiry only) */
  isInquiry?: boolean;
  /** e.g. report/block menu */
  trailingActions?: ReactNode;
}

function getInitial(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0]! + parts[parts.length - 1]![0]).toUpperCase();
  }
  return (name[0] ?? '?').toUpperCase();
}

export function ConversationChatHeader({
  proName,
  proAvatarUrl,
  bookingContext,
  bookingHref,
  isInquiry = false,
  trailingActions,
}: ConversationChatHeaderProps) {
  return (
    <header className="sticky top-0 z-10 flex items-center gap-3 border-b border-black/5 dark:border-white/10 bg-white dark:bg-[#171A20] px-4 py-3 shadow-sm safe-area-pt">
      <Link
        href="/customer/messages"
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[#6A6A6A] dark:text-[#A1A8B3] hover:bg-black/5 dark:hover:bg-white/5 transition-colors -ml-1"
        aria-label="Back to messages"
      >
        <ChevronLeft size={22} strokeWidth={2} />
      </Link>
      <div className="flex h-10 w-10 shrink-0 overflow-hidden rounded-full bg-[#F7F6F4] dark:bg-[#1D2128]">
        {proAvatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={proAvatarUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          <span className="flex h-full w-full items-center justify-center text-sm font-semibold text-[#6A6A6A] dark:text-[#A1A8B3]">
            {getInitial(proName)}
          </span>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="font-semibold text-[#111111] dark:text-[#F5F7FA] truncate">{proName}</p>
        <p className="text-xs text-[#6A6A6A] dark:text-[#A1A8B3] truncate">
          {isInquiry ? 'Questions only – no booking yet' : bookingContext ?? 'Conversation'}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {bookingHref && (
          <Link
            href={bookingHref}
            className="text-sm font-medium text-[#058954] hover:text-[#047a48] dark:hover:text-[#2dd68a]"
          >
            View booking
          </Link>
        )}
        {trailingActions}
      </div>
    </header>
  );
}
