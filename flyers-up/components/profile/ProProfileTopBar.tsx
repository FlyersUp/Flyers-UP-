'use client';

/**
 * Pro Profile Top Bar — Etsy-style
 * Back | Pro name | Message | Share
 */

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { MessageCircle, Share2 } from 'lucide-react';
import { useCallback, useState } from 'react';

export function ProProfileTopBar({
  title,
  messageHref,
  messageDisabled,
  shareUrl,
}: {
  title: string;
  messageHref: string | null;
  messageDisabled?: boolean;
  shareUrl?: string | null;
}) {
  const router = useRouter();
  const [copied, setCopied] = useState(false);

  const onShare = useCallback(async () => {
    const url = shareUrl ?? (typeof window !== 'undefined' ? window.location.href : null);
    if (!url) return;
    try {
      if (navigator.share) {
        await navigator.share({ title: `${title} on Flyers Up`, url });
        return;
      }
    } catch {
      /* fall through */
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1200);
    } catch {
      /* ignore */
    }
  }, [shareUrl, title]);

  return (
    <div className="sticky top-0 z-40 -mx-4 px-4 py-3 bg-white/95 dark:bg-[#171A20]/95 backdrop-blur-md border-b border-black/5 dark:border-white/10 safe-area-top">
      <div className="flex items-center gap-2 min-w-0">
        <button
          type="button"
          onClick={() => router.back()}
          className="h-9 w-9 shrink-0 flex items-center justify-center rounded-full border border-black/10 dark:border-white/10 bg-white dark:bg-[#1D2128] text-[#111111] dark:text-[#F5F7FA] hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
          aria-label="Back"
        >
          ←
        </button>
        <h1 className="min-w-0 flex-1 text-center text-base font-semibold text-[#111111] dark:text-[#F5F7FA] truncate px-1">
          {title}
        </h1>
        <div className="flex items-center gap-1.5 shrink-0">
          {messageHref && !messageDisabled ? (
            <Link
              href={messageHref}
              className="h-9 w-9 flex items-center justify-center rounded-full border border-black/10 dark:border-white/10 bg-white dark:bg-[#1D2128] text-[#111111] dark:text-[#F5F7FA] hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
              aria-label="Message"
            >
              <MessageCircle size={18} strokeWidth={2} />
            </Link>
          ) : (
            <button
              type="button"
              disabled
              className="h-9 w-9 flex items-center justify-center rounded-full border border-black/5 dark:border-white/5 bg-black/5 dark:bg-white/5 text-[#6A6A6A] dark:text-[#A1A8B3] cursor-not-allowed"
              aria-label="Message (start a booking to message)"
            >
              <MessageCircle size={18} strokeWidth={2} />
            </button>
          )}
          <button
            type="button"
            onClick={() => void onShare()}
            className="h-9 w-9 flex items-center justify-center rounded-full border border-black/10 dark:border-white/10 bg-white dark:bg-[#1D2128] text-[#111111] dark:text-[#F5F7FA] hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
            aria-label={copied ? 'Copied' : 'Share'}
          >
            <Share2 size={18} strokeWidth={2} />
          </button>
        </div>
      </div>
    </div>
  );
}
