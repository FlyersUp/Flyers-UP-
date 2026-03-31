'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useState } from 'react';
import { Share2 } from 'lucide-react';
import { NotificationBell } from '@/components/notifications/NotificationBell';

export function ProfileTopBar({
  title,
  shareUrl,
  notificationBasePath,
}: {
  title: string;
  shareUrl?: string | null;
  /** When set, renders the bell in the header row (use with AppLayout `showFloatingNotificationBell={false}`). */
  notificationBasePath?: 'customer' | 'pro';
}) {
  const router = useRouter();
  const [copied, setCopied] = useState(false);

  const onShare = useCallback(async () => {
    const url = shareUrl ?? (typeof window !== 'undefined' ? window.location.href : null);
    if (!url) return;
    try {
      if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
        await navigator.share({ title, url });
        return;
      }
    } catch {
      // ignore; fall back to clipboard
    }

    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1200);
    } catch {
      // ignore
    }
  }, [shareUrl, title]);

  return (
    <div className="sticky top-0 z-40 -mx-4 px-4 py-3 bg-[rgba(255,255,255,0.92)] dark:bg-[#171A20]/95 backdrop-blur border-b border-hairline safe-area-top">
      <div className="flex items-center gap-2 min-w-0">
        <button
          type="button"
          onClick={() => router.back()}
          className="h-9 w-9 shrink-0 rounded-full border border-hairline bg-white dark:bg-[#1D2128] shadow-sm hover:shadow transition-shadow"
          aria-label="Back"
        >
          ←
        </button>
        <h1 className="min-w-0 flex-1 text-center text-sm font-semibold truncate px-1 text-text">{title}</h1>
        <div className="flex shrink-0 items-center gap-1.5">
          <button
            type="button"
            onClick={() => void onShare()}
            className="h-9 w-9 flex items-center justify-center rounded-full border border-hairline bg-white dark:bg-[#1D2128] shadow-sm hover:shadow transition-shadow text-text"
            aria-label={copied ? 'Copied' : 'Share'}
          >
            <Share2 size={18} strokeWidth={2} />
          </button>
          {notificationBasePath ? <NotificationBell basePath={notificationBasePath} /> : null}
        </div>
      </div>
    </div>
  );
}
