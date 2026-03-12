/**
 * i18n configuration for Flyers Up.
 * Add new languages by creating messages/{locale}.json and adding to locales.
 */
export const locales = ['en', 'es', 'pt', 'fr'] as const;
export type Locale = (typeof locales)[number];

export const localeNames: Record<Locale, string> = {
  en: 'English',
  es: 'Español',
  pt: 'Português',
  fr: 'Français',
};

export const defaultLocale: Locale = 'en';

export function isValidLocale(value: string): value is Locale {
  return locales.includes(value as Locale);
}
