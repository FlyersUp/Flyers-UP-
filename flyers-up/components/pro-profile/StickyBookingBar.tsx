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
      className={`fixed left-0 right-0 z-40 border-t border-black/5 bg-[#F5F5F5]/95 px-4 py-3 shadow-[0_-2px_10px_rgba(0,0,0,0.06)] backdrop-blur-sm ${
        aboveBottomNav ? 'bottom-16' : 'bottom-0 pb-safe'
      }`}
    >
      <div className="mx-auto flex max-w-[720px] items-center gap-3">
        <Link
          href={bookHref}
          className="flex-1 rounded-xl bg-accent py-3 text-center font-semibold text-accentContrast shadow-sm transition-opacity hover:opacity-95 focus:outline-none focus:ring-2 focus:ring-accent/50"
        >
          Book now
        </Link>
        {messageHref && !messageDisabled ? (
          <Link
            href={messageHref}
            className="flex items-center justify-center gap-2 rounded-xl border border-black/10 bg-white px-4 py-3 font-semibold text-text shadow-sm transition-shadow hover:shadow-md focus:outline-none focus:ring-2 focus:ring-accent/30"
          >
            <MessageCircle size={18} strokeWidth={2} />
            <span className="hidden sm:inline">Message</span>
          </Link>
        ) : (
          <button
            type="button"
            disabled
            title="Start a booking to message this pro"
            className="flex items-center justify-center gap-2 rounded-xl border border-black/10 bg-white/60 px-4 py-3 font-semibold text-muted shadow-sm cursor-not-allowed"
          >
            <MessageCircle size={18} strokeWidth={2} />
            <span className="hidden sm:inline">Message</span>
          </button>
        )}
        <button
          type="button"
          onClick={() => void onShare()}
          className="flex h-[46px] w-[46px] shrink-0 items-center justify-center rounded-xl border border-black/10 bg-white shadow-sm transition-shadow hover:shadow-md focus:outline-none focus:ring-2 focus:ring-accent/30"
          aria-label={copied ? 'Copied' : 'Share'}
        >
          <Share2 size={20} strokeWidth={2} />
        </button>
      </div>
    </div>
  );
}
