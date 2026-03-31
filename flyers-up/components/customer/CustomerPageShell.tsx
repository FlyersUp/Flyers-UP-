'use client';

import { ReactNode, useEffect, useState } from 'react';
import { SideMenu } from '@/components/ui/SideMenu';
import { getCurrentUser } from '@/lib/api';

interface CustomerPageShellProps {
  title: string;
  children: ReactNode;
  /** Optional: pass userName to skip fetch. If not provided, fetches from API. */
  userName?: string;
  /** Optional: subtitle below the main content area */
  subtitle?: string;
}

/**
 * Shared shell for customer pages: sticky header with hamburger menu, consistent with
 * CustomerDashboard theme (light grey bg, uppercase sections, card styling).
 */
export function CustomerPageShell({ title, children, userName: userNameProp, subtitle }: CustomerPageShellProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [userName, setUserName] = useState(userNameProp ?? 'Account');

  useEffect(() => {
    if (userNameProp) {
      setUserName(userNameProp);
      return;
    }
    let mounted = true;
    getCurrentUser().then((user) => {
      if (!mounted || !user) return;
      const fallback = user.email?.split('@')[0] ?? 'Account';
      const full = user.fullName?.trim();
      setUserName(full || fallback);
    });
    return () => { mounted = false; };
  }, [userNameProp]);

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col w-full max-w-full overflow-x-clip bg-bg">
        <div className="sticky top-0 z-20 safe-area-top bg-bg/95 backdrop-blur-sm border-b border-border">
        <div className="max-w-4xl w-full min-w-0 mx-auto px-4 py-3 sm:py-4 flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => setMenuOpen(true)}
            className="h-10 w-10 rounded-xl bg-surface2 border border-border text-text hover:bg-surface2/80"
            aria-label="Open menu"
          >
            ☰
          </button>
          <h1 className="text-lg sm:text-xl font-semibold text-text truncate min-w-0 flex-1 text-center px-1">
            {title}
          </h1>
          <div className="w-10" />
        </div>
      </div>

      <div className="mobile-page-root flex-1 min-h-0">
        {subtitle && (
          <div className="max-w-4xl w-full min-w-0 mx-auto px-4 pt-4">
            <p className="text-sm text-text3">{subtitle}</p>
          </div>
        )}
        {children}
      </div>
      <SideMenu open={menuOpen} onClose={() => setMenuOpen(false)} role="customer" userName={userName} />
    </div>
  );
}
