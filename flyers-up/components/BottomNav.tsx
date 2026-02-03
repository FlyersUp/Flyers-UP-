'use client';

/**
 * Bottom Navigation Footer
 * Intentionally NOT tied to any mock token/user id.
 */

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect } from 'react';
import { AppIcon } from '@/components/ui/AppIcon';

export default function BottomNav() {
  const pathname = usePathname();
  const mode: 'customer' | 'pro' =
    pathname?.startsWith('/pro') || pathname?.startsWith('/dashboard/pro')
      ? 'pro'
      : pathname?.startsWith('/customer') || pathname?.startsWith('/dashboard/customer')
        ? 'customer'
        : 'customer';
  const isActive = (path: string) => pathname === path || pathname?.startsWith(path + '/');

  // Ensure role theme tokens apply even on pages not wrapped in ThemeProvider.
  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle('theme-pro', mode === 'pro');
    root.classList.toggle('theme-customer', mode === 'customer');
  }, [mode]);

  const homeHref = mode === 'pro' ? '/pro' : '/customer';
  const notificationsHref = mode === 'pro' ? '/pro/notifications' : '/customer/notifications';
  const messagesHref = mode === 'pro' ? '/pro/messages' : '/customer/messages';
  const settingsHref = mode === 'pro' ? '/pro/settings' : '/customer/settings';
  const activeLink = 'text-text';
  const inactiveLink = 'text-muted/70 hover:text-text';
  const activeIndicator =
    "after:content-[''] after:absolute after:-bottom-0.5 after:left-1/2 after:h-0.5 after:w-6 after:-translate-x-1/2 after:rounded-full after:bg-accent";

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-[var(--nav-solid)] border-t border-[var(--surface-border)] z-50 shadow-card safe-area-bottom opacity-100">
      <div className="max-w-7xl mx-auto px-2">
        <div className="flex items-center justify-around h-16">
          <Link
            href={homeHref}
            className={`relative flex flex-col items-center justify-center flex-1 h-full transition-colors ${
              isActive(homeHref) ? `${activeLink} ${activeIndicator}` : inactiveLink
            }`}
          >
            <span className="mb-1">
              <AppIcon name="home" size={22} className="" alt="Home" />
            </span>
            <span className="text-xs font-medium">Home</span>
          </Link>

          <Link
            href={notificationsHref}
            className={`relative flex flex-col items-center justify-center flex-1 h-full transition-colors ${
              isActive(notificationsHref) ? `${activeLink} ${activeIndicator}` : inactiveLink
            }`}
          >
            <span className="mb-1">
              <AppIcon name="bell" size={22} className="" alt="Notifications" />
            </span>
            <span className="text-xs font-medium">Notifications</span>
          </Link>

          <Link
            href={messagesHref}
            className={`relative flex flex-col items-center justify-center flex-1 h-full transition-colors ${
              isActive(messagesHref) ? `${activeLink} ${activeIndicator}` : inactiveLink
            }`}
          >
            <span className="mb-1">
              <AppIcon name="chat" size={22} className="" alt="Messages" />
            </span>
            <span className="text-xs font-medium">Messages</span>
          </Link>

          <Link
            href={settingsHref}
            className={`relative flex flex-col items-center justify-center flex-1 h-full transition-colors ${
              isActive(settingsHref) ? `${activeLink} ${activeIndicator}` : inactiveLink
            }`}
          >
            <span className="mb-1">
              <AppIcon name="settings" size={22} className="" alt="Settings" />
            </span>
            <span className="text-xs font-medium">Settings</span>
          </Link>
        </div>
      </div>
    </nav>
  );
}






