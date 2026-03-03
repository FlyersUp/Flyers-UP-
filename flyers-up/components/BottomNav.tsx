'use client';

/**
 * Bottom Navigation Footer
 * Intentionally NOT tied to any mock token/user id.
 * Unified active state: soft pill with subtle accent for all tabs.
 */

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, ReactNode } from 'react';
import { AppIcon } from '@/components/ui/AppIcon';
import { useNavAlerts } from '@/contexts/NavAlertsContext';
import { useNotifications } from '@/contexts/NotificationContext';

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
  return (
    <span
      className="absolute -top-0.5 -right-1 min-w-[1.25rem] h-5 px-1 rounded-full bg-[#FF6B6B] shrink-0 flex items-center justify-center text-[10px] font-bold text-white shadow-[0_0_0_3px_#FAF8F6]"
      aria-label={`${count} unread notifications`}
    >
      {count > 99 ? '99+' : count}
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
  iconName: 'home' | 'bell' | 'chat' | 'settings';
  badge?: ReactNode;
}

function TabItem({ href, isActive, label, iconName, badge }: TabItemProps) {
  return (
    <Link
      href={href}
      className={`${TAB_BASE} ${isActive ? TAB_ACTIVE : TAB_INACTIVE}`}
    >
      <span className="relative inline-block">
        <AppIcon name={iconName} size={22} className="" alt={label} />
        {badge}
      </span>
      <span className="text-[11px] font-medium">{label}</span>
    </Link>
  );
}

export default function BottomNav() {
  const pathname = usePathname();
  const { hasNewMessages } = useNavAlerts();
  const { unreadCount } = useNotifications();
  const mode: 'customer' | 'pro' = (() => {
    if (pathname?.startsWith('/pro') || pathname?.startsWith('/dashboard/pro')) return 'pro';
    if (pathname?.startsWith('/customer') || pathname?.startsWith('/dashboard/customer')) return 'customer';
    try {
      const last = window.localStorage.getItem('flyersup:lastRole');
      if (last === 'pro' || last === 'customer') return last;
    } catch {
      // ignore
    }
    return 'customer';
  })();
  const isActive = (path: string) => pathname === path || pathname?.startsWith(path + '/');

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle('theme-pro', mode === 'pro');
    root.classList.toggle('theme-customer', mode === 'customer');
  }, [mode]);

  const homeHref = mode === 'pro' ? '/pro' : '/customer';
  const notificationsHref = mode === 'pro' ? '/pro/notifications' : '/customer/notifications';
  const messagesHref = mode === 'pro' ? '/pro/messages' : '/customer/messages';
  const settingsHref = mode === 'pro' ? '/pro/settings' : '/customer/settings';

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-[#FAF8F6] border-t border-black/5 z-50 shadow-[0_-2px_10px_rgba(0,0,0,0.04)] safe-area-bottom opacity-100">
      <div className="max-w-7xl mx-auto px-2">
        <div className="flex items-center justify-around h-16">
          <TabItem
            href={homeHref}
            isActive={isActive(homeHref)}
            label="Home"
            iconName="home"
          />
          <TabItem
            href={notificationsHref}
            isActive={isActive(notificationsHref)}
            label="Notifications"
            iconName="bell"
            badge={<NotificationBadge count={unreadCount} />}
          />
          <TabItem
            href={messagesHref}
            isActive={isActive(messagesHref)}
            label="Messages"
            iconName="chat"
            badge={<NavAlertDot show={hasNewMessages} />}
          />
          <TabItem
            href={settingsHref}
            isActive={isActive(settingsHref)}
            label="Settings"
            iconName="settings"
          />
        </div>
      </div>
    </nav>
  );
}






