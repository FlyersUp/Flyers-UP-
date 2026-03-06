'use client';

/**
 * Bottom Navigation Footer
 * Premium floating light-theme mobile tab bar.
 * Matches Uber / Airbnb / modern iOS app navigation.
 */

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState, ReactNode } from 'react';
import { Home, MessageCircle, Settings, FileText, ClipboardList, Calendar } from 'lucide-react';
import { useNavAlerts } from '@/contexts/NavAlertsContext';
import { useUnreadNotifications } from '@/hooks/useUnreadNotifications';

const ICON_SIZE = 24;
const ICON_STROKE = 1.75;

function NavAlertDot({ show }: { show: boolean }) {
  if (!show) return null;
  return (
    <span
      className="absolute -top-0.5 -right-1 w-2.5 h-2.5 rounded-full bg-red-500 border-2 border-white/95 shrink-0"
      aria-label="New"
    />
  );
}

function NotificationBadge({ count }: { count: number }) {
  if (count <= 0) return null;
  const display = count > 99 ? '99+' : count;
  return (
    <span
      className="absolute -top-1 -right-2 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[11px] font-semibold leading-[18px] text-center flex items-center justify-center shrink-0 border-2 border-white/95"
      aria-label={`${count} unread notifications`}
    >
      {display}
    </span>
  );
}

function NavIconWithBadge({ icon, badge }: { icon: ReactNode; badge?: ReactNode }) {
  return (
    <span className="relative inline-flex">
      {icon}
      {badge}
    </span>
  );
}

interface TabItemProps {
  href: string;
  isActive: boolean;
  label: string;
  icon: ReactNode;
  badge?: ReactNode;
  ariaLabel?: string;
  mode: 'customer' | 'pro';
}

function TabItem({ href, isActive, label, icon, badge, ariaLabel, mode }: TabItemProps) {
  const accentColor = mode === 'pro' ? 'text-[#D97706]' : 'text-[#058954]';
  const accentBg = mode === 'pro' ? 'bg-[#FFC067]/25' : 'bg-[#B2FBA5]/35';

  return (
    <Link
      href={href}
      className="group flex-1 flex flex-col items-center justify-center min-h-[68px] gap-1.5 py-2 px-2 rounded-lg transition-colors focus-visible:ring-2 focus-visible:ring-neutral-300 focus-visible:ring-offset-2 focus:outline-none active:scale-[0.98]"
      aria-label={ariaLabel ?? label}
    >
      <span
        className={`inline-flex items-center justify-center rounded-full px-3 py-1.5 transition-colors ${
          isActive ? accentBg : 'hover:bg-neutral-100'
        }`}
      >
        <span className={isActive ? accentColor : 'text-neutral-500 group-hover:text-neutral-700'}>
          <NavIconWithBadge icon={icon} badge={badge} />
        </span>
      </span>
      <span
        className={`text-[11px] leading-tight ${
          isActive ? 'font-medium text-neutral-900' : 'font-normal text-neutral-500'
        }`}
      >
        {label}
      </span>
    </Link>
  );
}

function getModeFromPath(pathname: string | null): 'customer' | 'pro' | null {
  if (pathname?.startsWith('/pro') || pathname?.startsWith('/dashboard/pro')) return 'pro';
  if (
    pathname?.startsWith('/customer') ||
    pathname?.startsWith('/dashboard/customer') ||
    pathname?.startsWith('/flyer-wall') ||
    pathname?.startsWith('/requests')
  )
    return 'customer';
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
  const flyerWallHref = '/flyer-wall';
  const requestsHref = mode === 'pro' ? '/pro/requests' : '/customer/requests';
  const bookingsHref = mode === 'pro' ? '/pro/bookings' : '/customer/bookings';
  const messagesHref = mode === 'pro' ? '/pro/messages' : '/customer/messages';
  const settingsHref = mode === 'pro' ? '/pro/settings' : '/customer/settings';

  const iconClass = 'shrink-0 text-current [&>svg]:transition-colors';

  return (
    <nav className="fixed bottom-0 inset-x-0 z-50 border-t border-[#E5E5E5] bg-white/95 backdrop-blur-md supports-[backdrop-filter]:bg-white/80 shadow-[0_-6px_20px_rgba(0,0,0,0.06)] safe-area-bottom">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-stretch justify-around min-h-[68px]">
          <TabItem
            href={homeHref}
            isActive={isActive(homeHref)}
            label="Home"
            icon={<Home size={ICON_SIZE} strokeWidth={ICON_STROKE} className={iconClass} />}
            mode={mode}
          />
          {mode === 'customer' && (
            <TabItem
              href={flyerWallHref}
              isActive={isActive(flyerWallHref)}
              label="Flyer Wall"
              icon={<FileText size={ICON_SIZE} strokeWidth={ICON_STROKE} className={iconClass} />}
              mode={mode}
            />
          )}
          <TabItem
            href={requestsHref}
            isActive={isActive(requestsHref)}
            label="Requests"
            icon={<ClipboardList size={ICON_SIZE} strokeWidth={ICON_STROKE} className={iconClass} />}
            mode={mode}
          />
          <TabItem
            href={bookingsHref}
            isActive={isActive(bookingsHref)}
            label="Bookings"
            icon={<Calendar size={ICON_SIZE} strokeWidth={ICON_STROKE} className={iconClass} />}
            mode={mode}
          />
          <TabItem
            href={messagesHref}
            isActive={isActive(messagesHref)}
            label="Messages"
            icon={<MessageCircle size={ICON_SIZE} strokeWidth={ICON_STROKE} className={iconClass} />}
            badge={<NavAlertDot show={hasNewMessages} />}
            mode={mode}
          />
          <TabItem
            href={settingsHref}
            isActive={isActive(settingsHref)}
            label="Profile"
            icon={<Settings size={ICON_SIZE} strokeWidth={ICON_STROKE} className={iconClass} />}
            mode={mode}
          />
        </div>
      </div>
    </nav>
  );
}
