'use client';

import { ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';

/**
 * Go Back button for error/not-found pages.
 * Uses router.back() — if no history, Next.js typically navigates to referrer or home.
 */
export function GoBackButton() {
  const router = useRouter();
  return (
    <button
      type="button"
      onClick={() => router.back()}
      className="inline-flex items-center justify-center gap-2 h-11 px-5 rounded-full text-sm font-medium border border-black/15 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
    >
      <ArrowLeft size={18} strokeWidth={2} />
      Go Back
    </button>
  );
}
