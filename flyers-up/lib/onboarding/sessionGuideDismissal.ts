/**
 * Session-only dismissal for the product tour (Welcome / How it works).
 * Does not persist to DB — user can see the guide again next browser session.
 * Clearing is used when replaying from Settings.
 */

const STORAGE_PREFIX = 'flyersup:guide_dismissed_session:';

export function sessionGuideStorageKey(userId: string): string {
  return `${STORAGE_PREFIX}${userId}`;
}

export function isSessionGuideDismissed(userId: string | null): boolean {
  if (!userId || typeof window === 'undefined') return false;
  try {
    return window.sessionStorage.getItem(sessionGuideStorageKey(userId)) === '1';
  } catch {
    return false;
  }
}

export function setSessionGuideDismissed(userId: string | null): void {
  if (!userId || typeof window === 'undefined') return;
  try {
    window.sessionStorage.setItem(sessionGuideStorageKey(userId), '1');
  } catch {
    // ignore quota / private mode
  }
}

export function clearSessionGuideDismissed(userId: string | null): void {
  if (!userId || typeof window === 'undefined') return;
  try {
    window.sessionStorage.removeItem(sessionGuideStorageKey(userId));
  } catch {
    // ignore
  }
}
