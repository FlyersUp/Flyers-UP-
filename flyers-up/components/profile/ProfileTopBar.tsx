'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useState } from 'react';

export function ProfileTopBar({
  title,
  shareUrl,
}: {
  title: string;
  shareUrl?: string | null;
}) {
  const router = useRouter();
  const [copied, setCopied] = useState(false);

  const onShare = useCallback(async () => {
    const url = shareUrl ?? (typeof window !== 'undefined' ? window.location.href : null);
    if (!url) return;
    try {
      if ((navigator as any).share) {
        await (navigator as any).share({ title, url });
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
    <div className="sticky top-0 z-40 -mx-4 px-4 py-3 bg-[rgba(255,255,255,0.92)] backdrop-blur border-b border-hairline">
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => router.back()}
          className="h-9 w-9 rounded-full border border-hairline bg-white shadow-sm hover:shadow transition-shadow"
          aria-label="Back"
        >
          ←
        </button>
        <div className="min-w-0 flex-1 text-center">
          <div className="text-sm font-semibold truncate">{title}</div>
        </div>
        <button
          type="button"
          onClick={() => void onShare()}
          className="h-9 px-3 rounded-full border border-hairline bg-white shadow-sm hover:shadow transition-shadow text-sm font-medium"
          aria-label="Share"
        >
          {copied ? 'Copied' : 'Share'}
        </button>
      </div>
    </div>
  );
}

