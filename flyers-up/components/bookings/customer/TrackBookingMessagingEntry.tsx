'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { MessageCircle, ChevronRight } from 'lucide-react';

export interface MessagesSummary {
  unreadCount: number;
  lastMessage: string | null;
  lastMessageAt: string | null;
  lastMessageFromPro: boolean;
  hasUnread: boolean;
}

export interface TrackBookingMessagingEntryProps {
  bookingId: string;
  /** Optional pre-fetched summary; if not provided, fetches from API */
  summary?: MessagesSummary | null;
  className?: string;
}

function formatRelativeTime(iso: string): string {
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '';
    const now = Date.now();
    const diff = now - d.getTime();
    const mins = Math.floor(diff / 60_000);
    const hours = Math.floor(diff / 3600_000);
    const days = Math.floor(diff / 86400_000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return d.toLocaleDateString();
  } catch {
    return '';
  }
}

function truncatePreview(text: string, maxLen = 50): string {
  const t = text.trim();
  if (t.length <= maxLen) return t;
  return t.slice(0, maxLen) + '…';
}

export function TrackBookingMessagingEntry({
  bookingId,
  summary: initialSummary,
  className = '',
}: TrackBookingMessagingEntryProps) {
  const [summary, setSummary] = useState<MessagesSummary | null>(initialSummary ?? null);
  const [loading, setLoading] = useState(!initialSummary);

  useEffect(() => {
    if (initialSummary) {
      setSummary(initialSummary);
      setLoading(false);
      return;
    }
    let cancelled = false;
    fetch(`/api/customer/bookings/${bookingId}/messages-summary`, { cache: 'no-store' })
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        setSummary({
          unreadCount: data.unreadCount ?? 0,
          lastMessage: data.lastMessage ?? null,
          lastMessageAt: data.lastMessageAt ?? null,
          lastMessageFromPro: data.lastMessageFromPro ?? false,
          hasUnread: data.hasUnread ?? false,
        });
      })
      .catch(() => {
        if (!cancelled) setSummary(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [bookingId, initialSummary]);

  const hasUnread = summary?.hasUnread ?? false;
  const unreadCount = summary?.unreadCount ?? 0;
  const lastMessage = summary?.lastMessage ?? null;
  const lastMessageAt = summary?.lastMessageAt ?? null;

  const previewText = lastMessage
    ? truncatePreview(lastMessage)
    : 'Ask questions or coordinate arrival';
  const timeText = lastMessageAt ? formatRelativeTime(lastMessageAt) : null;

  return (
    <Link
      href={`/customer/chat/${bookingId}`}
      className={`
        flex items-center gap-3 rounded-2xl border p-4 shadow-sm transition-colors
        ${hasUnread
          ? 'border-[#058954]/30 dark:border-[#058954]/40 bg-[#058954]/5 dark:bg-[#058954]/10 hover:bg-[#058954]/10 dark:hover:bg-[#058954]/15'
          : 'border-black/5 dark:border-white/10 bg-white dark:bg-[#171A20] hover:bg-black/[0.02] dark:hover:bg-white/[0.02]'
        }
        ${className}
      `}
      aria-label={hasUnread ? `Message pro — ${unreadCount} unread` : 'Message pro'}
    >
      <div
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
          hasUnread ? 'bg-[#058954]/20 dark:bg-[#058954]/30 ring-2 ring-[#058954]/40' : 'bg-[#058954]/10 dark:bg-[#058954]/20'
        }`}
      >
        <MessageCircle size={20} className="text-[#058954]" strokeWidth={2} aria-hidden />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="font-medium text-[#111111] dark:text-[#F5F7FA]">Message pro</p>
          {hasUnread && (
            <span
              className="inline-flex min-w-[1.25rem] items-center justify-center rounded-full bg-[#058954] px-1.5 py-0.5 text-xs font-semibold text-white"
              aria-hidden
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </div>
        <p className={`text-sm ${hasUnread ? 'font-medium text-[#111111] dark:text-[#F5F7FA]' : 'text-[#6A6A6A] dark:text-[#A1A8B3]'}`}>
          {loading ? 'Loading…' : previewText}
        </p>
        {timeText && (
          <p className="mt-0.5 text-xs text-[#8A8A8A] dark:text-[#7A8490]">{timeText}</p>
        )}
      </div>
      <ChevronRight size={18} className="shrink-0 text-[#8A8A8A] dark:text-[#7A8490]" aria-hidden />
    </Link>
  );
}
