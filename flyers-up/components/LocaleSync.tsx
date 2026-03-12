'use client';

import { useLocale } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useEffect, useRef } from 'react';
import { getStoredLocale, setLocale } from '@/lib/i18n/client';
import { isValidLocale } from '@/i18n/config';

/**
 * Syncs localStorage language preference to cookie on mount if they differ.
 * Ensures user's saved preference is applied even after cookie was cleared.
 */
export function LocaleSync() {
  const locale = useLocale();
  const router = useRouter();
  const hasSynced = useRef(false);

  useEffect(() => {
    if (hasSynced.current) return;
    const stored = getStoredLocale();
    if (stored && isValidLocale(stored) && stored !== locale) {
      hasSynced.current = true;
      setLocale(stored);
      router.refresh();
    }
  }, [locale, router]);

  return null;
}
