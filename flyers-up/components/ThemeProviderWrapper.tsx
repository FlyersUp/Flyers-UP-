'use client';

/**
 * Root-level ThemeProvider wrapper.
 * Single source of truth for light/dark and role (customer/pro).
 * - Derives mode from pathname so theme-customer/theme-pro apply on all routes.
 * - Reads theme (light/dark) from localStorage and applies .dark class on html.
 * Must wrap the entire app in root layout.
 */
import { usePathname } from 'next/navigation';
import { ThemeProvider } from '@/contexts/ThemeContext';

function getModeFromPath(pathname: string | null): 'customer' | 'pro' {
  if (!pathname) return 'customer';
  if (pathname.startsWith('/pro') || pathname.startsWith('/dashboard/pro')) return 'pro';
  if (
    pathname.startsWith('/customer') ||
    pathname.startsWith('/dashboard/customer') ||
    pathname.startsWith('/flyer-wall') ||
    pathname.startsWith('/requests')
  )
    return 'customer';
  try {
    const last = typeof window !== 'undefined' ? window.localStorage.getItem('flyersup:lastRole') : null;
    if (last === 'pro' || last === 'customer') return last;
  } catch {
    // ignore
  }
  return 'customer';
}

export function ThemeProviderWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const mode = getModeFromPath(pathname);
  return <ThemeProvider mode={mode}>{children}</ThemeProvider>;
}
