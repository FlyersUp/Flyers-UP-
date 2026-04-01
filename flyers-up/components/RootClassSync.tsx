'use client';

import { useLayoutEffect } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { DARK_MODE_END_USER_ENABLED } from '@/lib/themeFeatureFlags';

type ThemeMode = 'customer' | 'pro';

function resolveMode(pathname: string, searchParams: URLSearchParams): ThemeMode {
  // Auth routes can explicitly select role via query param.
  if (pathname.startsWith('/signin') || pathname.startsWith('/signup')) {
    return searchParams.get('role') === 'pro' ? 'pro' : 'customer';
  }

  if (pathname.startsWith('/pro') || pathname.startsWith('/dashboard/pro')) return 'pro';
  if (pathname.startsWith('/customer') || pathname.startsWith('/dashboard/customer')) return 'customer';

  // Shared/public routes: use last-used role to avoid "flipping sides" visually.
  try {
    const last = window.localStorage.getItem('flyersup:lastRole');
    if (last === 'pro' || last === 'customer') return last;
  } catch {
    // ignore
  }
  return 'customer';
}

function resolveDarkFromStorage(): boolean {
  // Option C: dark only when explicitly chosen.
  try {
    const pref = window.localStorage.getItem('flyersup:theme');
    const legacy = window.localStorage.getItem('flyersup:darkMode');
    if (pref === 'dark') return true;
    if (pref === 'light') return false;
    if (pref === 'system') return false;
    if (legacy === '1') return true;
    if (legacy === '0') return false;
  } catch {
    // ignore
  }
  return false;
}

/**
 * Keeps `document.documentElement` classes in sync across client-side navigations.
 * This reduces auth-page flicker caused by stale `.theme-*` or `.dark` classes
 * when moving between AppLayout-wrapped routes and standalone auth routes.
 */
export function RootClassSync() {
  const pathname = usePathname() ?? '/';
  const searchParams = useSearchParams();

  useLayoutEffect(() => {
    const root = document.documentElement;

    // Dark mode (skipped entirely while DARK_MODE_END_USER_ENABLED is false)
    root.classList.toggle('dark', DARK_MODE_END_USER_ENABLED && resolveDarkFromStorage());

    // Role theme
    const mode = resolveMode(pathname, searchParams);
    root.classList.toggle('theme-customer', mode === 'customer');
    root.classList.toggle('theme-pro', mode === 'pro');
  }, [pathname, searchParams]);

  return null;
}

