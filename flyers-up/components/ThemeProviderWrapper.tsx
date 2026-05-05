'use client';

/**
 * Root-level ThemeProvider wrapper.
 * Single source of truth for light/dark and role (customer/pro).
 * - Derives mode from pathname where unambiguous.
 * - /flyer-wall is shared: after mount, use flyersup:lastRole (aligned with FloatingBottomNav).
 */
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { ViewportOverflowDebug } from '@/components/dev/ViewportOverflowDebug';
import { StandaloneModeSync } from '@/components/StandaloneModeSync';
import { BrowserCompatibilityGate } from '@/components/BrowserCompatibilityGate';

function getStaticModeFromPath(pathname: string | null): 'customer' | 'pro' | null {
  if (!pathname) return null;
  if (pathname.startsWith('/pro') || pathname.startsWith('/dashboard/pro')) return 'pro';
  if (pathname.startsWith('/leaderboard')) return 'pro';
  if (
    pathname.startsWith('/customer') ||
    pathname.startsWith('/dashboard/customer') ||
    pathname.startsWith('/top-pros') ||
    pathname.startsWith('/requests') ||
    pathname.startsWith('/occupations')
  )
    return 'customer';
  return null;
}

export function ThemeProviderWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const staticMode = getStaticModeFromPath(pathname);
  const [flyWallRole, setFlyWallRole] = useState<'customer' | 'pro'>('customer');

  useEffect(() => {
    if (!pathname?.startsWith('/flyer-wall')) return;
    try {
      const r = window.localStorage.getItem('flyersup:lastRole');
      setFlyWallRole(r === 'pro' ? 'pro' : 'customer');
    } catch {
      setFlyWallRole('customer');
    }
  }, [pathname]);

  const mode: 'customer' | 'pro' =
    staticMode ?? (pathname?.startsWith('/flyer-wall') ? flyWallRole : 'customer');

  return (
    <ThemeProvider mode={mode}>
      <BrowserCompatibilityGate>
        <ViewportOverflowDebug />
        <StandaloneModeSync />
        {children}
      </BrowserCompatibilityGate>
    </ThemeProvider>
  );
}
