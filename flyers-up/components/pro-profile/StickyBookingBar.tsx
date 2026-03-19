'use client';

import Link from 'next/link';
import { useCallback, useState } from 'react';
import { MessageCircle, Share2 } from 'lucide-react';

interface StickyBookingBarProps {
  bookHref: string;
  messageHref: string | null;
  messageDisabled?: boolean;
  proName: string;
  shareUrl?: string | null;
  /** When true, position above BottomNav (64px) */
  aboveBottomNav?: boolean;
}

export function StickyBookingBar({
  bookHref,
  messageHref,
  messageDisabled = false,
  proName,
  shareUrl,
  aboveBottomNav = true,
}: StickyBookingBarProps) {
  const [copied, setCopied] = useState(false);

  const onShare = useCallback(async () => {
    const url = shareUrl ?? (typeof window !== 'undefined' ? window.location.href : null);
    if (!url) return;
    try {
      if (navigator.share) {
        await navigator.share({
          title: `${proName} on Flyers Up`,
          url,
        });
        return;
      }
    } catch {
      // fall through to clipboard
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1200);
    } catch {
      // ignore
    }
  }, [shareUrl, proName]);

  return (
    <div
      className={`fixed left-0 right-0 z-40 border-t border-black/5 dark:border-white/10 bg-white/95 dark:bg-[#171A20]/95 px-4 py-3 shadow-[0_-2px_10px_rgba(0,0,0,0.06)] dark:shadow-[0_-2px_10px_rgba(0,0,0,0.3)] backdrop-blur-sm ${
        aboveBottomNav ? 'bottom-16' : 'bottom-0 pb-safe'
      }`}
    >
      <div className="mx-auto flex max-w-[720px] items-center gap-2 sm:gap-3">
        {/* Primary: Book — dominant, mobile-optimized */}
        <Link
          href={bookHref}
          className="flex-1 min-w-0 rounded-xl bg-accent py-3.5 sm:py-3 text-center text-sm sm:text-base font-semibold text-accentContrast shadow-sm transition-opacity hover:opacity-95 active:scale-[0.99] focus:outline-none focus:ring-2 focus:ring-accent/50"
        >
          Book now
        </Link>
        {/* Secondary: Message — supportive, icon-only on mobile */}
        {messageHref && !messageDisabled ? (
          <Link
            href={messageHref}
            className="flex h-11 w-11 sm:h-[46px] sm:w-auto sm:min-w-[100px] shrink-0 items-center justify-center gap-1.5 rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-[#1D2128] text-[#6A6A6A] dark:text-[#A1A8B3] hover:bg-black/5 dark:hover:bg-white/5 transition-colors focus:outline-none focus:ring-2 focus:ring-accent/20"
            aria-label="Message pro"
          >
            <MessageCircle size={18} strokeWidth={2} />
            <span className="hidden sm:inline text-sm font-medium">Message</span>
          </Link>
        ) : (
          <button
            type="button"
            disabled
            title="Start a booking to message this pro"
            className="flex h-11 w-11 sm:h-[46px] sm:w-auto sm:min-w-[100px] shrink-0 items-center justify-center gap-1.5 rounded-xl border border-black/5 dark:border-white/5 bg-black/5 dark:bg-white/5 text-[#9CA3AF] dark:text-[#6B7280] cursor-not-allowed"
            aria-label="Message (start a booking first)"
          >
            <MessageCircle size={18} strokeWidth={2} />
            <span className="hidden sm:inline text-sm font-medium">Message</span>
          </button>
        )}
        <button
          type="button"
          onClick={() => void onShare()}
          className="flex h-11 w-11 sm:h-[46px] sm:w-11 shrink-0 items-center justify-center rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-[#1D2128] text-[#6A6A6A] dark:text-[#A1A8B3] hover:bg-black/5 dark:hover:bg-white/5 transition-colors focus:outline-none focus:ring-2 focus:ring-accent/20"
          aria-label={copied ? 'Copied' : 'Share'}
        >
          <Share2 size={18} strokeWidth={2} />
        </button>
      </div>
    </div>
  );
}
