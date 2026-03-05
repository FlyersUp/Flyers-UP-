'use client';

/**
 * Bottom Navigation Footer
 * Uses lucide-react icons for consistent outline style across all tabs.
 * Unified active state: soft pill with subtle accent for all tabs.
 */

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState, ReactNode } from 'react';
import { Home, Bell, MessageCircle, Settings } from 'lucide-react';
import { useNavAlerts } from '@/contexts/NavAlertsContext';
import { useUnreadNotifications } from '@/hooks/useUnreadNotifications';

const ICON_SIZE = 24;
const ICON_STROKE = 1.5;

function NavAlertDot({ show }: { show: boolean }) {
  if (!show) return null;
  return (
    <span
      className="absolute -top-0.5 -right-1 w-2.5 h-2.5 rounded-full bg-danger border-2 border-[#FAF8F6] shrink-0"
      aria-label="New"
    />
  );
}

function NotificationBadge({ count }: { count: number }) {
  if (count <= 0) return null;
  const display = count > 99 ? '99+' : count;
  return (
    <span
      className="absolute -top-1 -right-2 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[11px] font-semibold leading-[18px] text-center flex items-center justify-center shrink-0 border-2 border-[#FAF8F6]"
      aria-label={`${count} unread notifications`}
    >
      {display}
    </span>
  );
}

/** Wrapper for nav icon + optional badge. Badge positioned top-right, iOS-style. */
function NavIconWithBadge({
  icon,
  badge,
}: {
  icon: ReactNode;
  badge?: ReactNode;
}) {
  return (
    <span className="relative inline-flex">
      {icon}
      {badge}
    </span>
  );
}

const TAB_BASE =
  'flex-1 flex flex-col items-center justify-center px-3 py-2 rounded-full min-h-[44px] gap-0.5 transition-colors focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus:outline-none';
const TAB_ACTIVE = 'bg-accent/10 text-accent';
const TAB_INACTIVE = 'text-black/50 hover:text-black/70';

interface TabItemProps {
  href: string;
  isActive: boolean;
  label: string;
  icon: ReactNode;
  badge?: ReactNode;
  ariaLabel?: string;
}

function TabItem({ href, isActive, label, icon, badge, ariaLabel }: TabItemProps) {
  return (
    <Link
      href={href}
      className={`${TAB_BASE} ${isActive ? TAB_ACTIVE : TAB_INACTIVE}`}
      aria-label={ariaLabel ?? label}
    >
      <NavIconWithBadge icon={icon} badge={badge} />
      <span className="text-[11px] font-medium">{label}</span>
    </Link>
  );
}

function getModeFromPath(pathname: string | null): 'customer' | 'pro' | null {
  if (pathname?.startsWith('/pro') || pathname?.startsWith('/dashboard/pro')) return 'pro';
  if (pathname?.startsWith('/customer') || pathname?.startsWith('/dashboard/customer')) return 'customer';
  return null;
}

export default function BottomNav() {
  const pathname = usePathname();
  const { hasNewMessages } = useNavAlerts();
  const { unreadCount } = useUnreadNotifications();
  const pathMode = getModeFromPath(pathname);
  const [storageMode, setStorageMode] = useState<'customer' | 'pro'>('customer');
  const mode: 'customer' | 'pro' = pathMode ?? storageMode;
  const isActive = (path: string) => pathname === path || pathname?.startsWith(path + '/');

  useEffect(() => {
    if (pathMode != null) return;
    try {
      const last = window.localStorage.getItem('flyersup:lastRole');
      if (last === 'pro' || last === 'customer') setStorageMode(last);
    } catch {
      // ignore
    }
  }, [pathMode]);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle('theme-pro', mode === 'pro');
    root.classList.toggle('theme-customer', mode === 'customer');
  }, [mode]);

  const homeHref = mode === 'pro' ? '/pro' : '/customer';
  const notificationsHref = mode === 'pro' ? '/pro/notifications' : '/customer/notifications';
  const messagesHref = mode === 'pro' ? '/pro/messages' : '/customer/messages';
  const settingsHref = mode === 'pro' ? '/pro/settings' : '/customer/settings';

  const iconClass = 'shrink-0';
  const notificationsAriaLabel =
    unreadCount > 0 ? `Notifications, ${unreadCount} unread` : 'Notifications';

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-[#FAF8F6] border-t border-black/5 z-50 shadow-[0_-2px_10px_rgba(0,0,0,0.04)] safe-area-bottom opacity-100">
      <div className="max-w-7xl mx-auto px-2">
        <div className="flex items-center justify-around h-16">
          <TabItem
            href={homeHref}
            isActive={isActive(homeHref)}
            label="Home"
            icon={<Home size={ICON_SIZE} strokeWidth={ICON_STROKE} className={iconClass} />}
          />
          <TabItem
            href={notificationsHref}
            isActive={isActive(notificationsHref)}
            label="Notifications"
            icon={<Bell size={ICON_SIZE} strokeWidth={ICON_STROKE} className={iconClass} />}
            badge={<NotificationBadge count={unreadCount} />}
            ariaLabel={notificationsAriaLabel}
          />
          <TabItem
            href={messagesHref}
            isActive={isActive(messagesHref)}
            label="Messages"
            icon={<MessageCircle size={ICON_SIZE} strokeWidth={ICON_STROKE} className={iconClass} />}
            badge={<NavAlertDot show={hasNewMessages} />}
          />
          <TabItem
            href={settingsHref}
            isActive={isActive(settingsHref)}
            label="Settings"
            icon={<Settings size={ICON_SIZE} strokeWidth={ICON_STROKE} className={iconClass} />}
          />
        </div>
      </div>
    </nav>
  );
}
