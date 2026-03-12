/**
 * Client-side i18n utilities.
 * Syncs locale between cookie (for server) and localStorage (for persistence).
 */

const COOKIE_NAME = 'NEXT_LOCALE';
const STORAGE_KEY = 'language';
const COOKIE_MAX_AGE = 365 * 24 * 60 * 60; // 1 year

export function setLocaleCookie(locale: string): void {
  if (typeof document === 'undefined') return;
  document.cookie = `${COOKIE_NAME}=${locale}; path=/; max-age=${COOKIE_MAX_AGE}; SameSite=Lax`;
}

export function getStoredLocale(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(STORAGE_KEY);
}

export function setStoredLocale(locale: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, locale);
}

/**
 * Set locale and persist to both cookie and localStorage.
 * Call router.refresh() after this to apply the new locale.
 */
export function setLocale(locale: string): void {
  setLocaleCookie(locale);
  setStoredLocale(locale);
}
