'use client';

import { useLocale, useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { setLocale } from '@/lib/i18n/client';
import { locales, localeNames, type Locale } from '@/i18n/config';

interface LanguageSwitcherProps {
  /** Inline dropdown vs full list */
  variant?: 'dropdown' | 'list';
  className?: string;
}

export default function LanguageSwitcher({ variant = 'list', className = '' }: LanguageSwitcherProps) {
  const t = useTranslations('language');
  const locale = useLocale() as Locale;
  const router = useRouter();

  function handleSelect(newLocale: Locale) {
    if (newLocale === locale) return;
    setLocale(newLocale);
    router.refresh();
  }

  if (variant === 'dropdown') {
    return (
      <select
        value={locale}
        onChange={(e) => handleSelect(e.target.value as Locale)}
        className={`rounded-xl border border-[#D8D8D2] dark:border-white/10 bg-[#F7F7F4] dark:bg-white/5 px-4 py-3 text-[#1F2937] dark:text-gray-100 text-sm font-medium ${className}`}
        aria-label={t('title')}
      >
        {locales.map((loc) => (
          <option key={loc} value={loc}>
            {localeNames[loc]}
          </option>
        ))}
      </select>
    );
  }

  return (
    <div className={`flex flex-col gap-1 ${className}`} role="group" aria-label={t('title')}>
      {locales.map((loc) => (
        <button
          key={loc}
          type="button"
          onClick={() => handleSelect(loc)}
          className={`rounded-2xl px-4 py-4 text-left text-[1.1rem] font-medium transition hover:bg-black/[0.03] dark:hover:bg-white/10 ${
            loc === locale
              ? 'bg-black/[0.04] dark:bg-white/10 text-[#1F2937] dark:text-white'
              : 'text-[#1F2937] dark:text-gray-100'
          }`}
        >
          {localeNames[loc]}
        </button>
      ))}
    </div>
  );
}
