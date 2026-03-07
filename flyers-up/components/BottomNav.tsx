'use client';

/**
 * Bottom Navigation - Individual floating action buttons
 * No shared dock/pill background. Each button floats independently.
 * Premium iOS look with adaptive theme.
 */

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState, ReactNode } from 'react';
import {
  Home,
  MessageCircle,
  User,
  ClipboardList,
  Search,
} from 'lucide-react';
import { useNavAlerts } from '@/contexts/NavAlertsContext';

const ICON_SIZE = 22;
const ICON_STROKE = 1.75;

function NavAlertDot({ show }: { show: boolean }) {
  if (!show) return null;
  return (
    <span
      className="absolute -top-0.5 -right-1 w-2.5 h-2.5 rounded-full bg-red-500 dark:bg-[#F07A7A] border-2 border-white dark:border-[#171A20] shrink-0"
      aria-label="New"
    />
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

/* Light: rgba(255,255,255,0.92) bg, #E5E5E5 border, #111111 icon
   Dark: rgba(23,26,32,0.92) bg, rgba(255,255,255,0.08) border, #F5F7FA icon */
const SIDE_BTN = 'flex items-center justify-center w-12 h-12 rounded-full border shadow-[0_2px_8px_rgba(0,0,0,0.08)] dark:shadow-[0_2px_12px_rgba(0,0,0,0.4)] transition-all duration-150 active:scale-95 focus-visible:ring-2 focus-visible:ring-offset-2 focus:outline-none bg-[rgba(255,255,255,0.92)] dark:bg-[rgba(23,26,32,0.92)] border-[#E5E5E5] dark:border-white/10 backdrop-blur-md';

interface SideTabProps {
  href: string;
  isActive: boolean;
  icon: ReactNode;
  badge?: ReactNode;
  ariaLabel: string;
  mode: 'customer' | 'pro';
}

function SideTab({ href, isActive, icon, badge, ariaLabel, mode }: SideTabProps) {
  const accentColor = mode === 'pro' ? 'text-[#D97706] dark:text-[#E8B15A]' : 'text-[#058954] dark:text-[#9FE38F]';
  const inactiveColor = 'text-[#6B7280] dark:text-[#A1A8B3]';

  return (
    <Link
      href={href}
      className={`${SIDE_BTN} focus-visible:ring-[#E5E5E5] dark:focus-visible:ring-white/20 ${isActive ? accentColor : inactiveColor + ' hover:text-[#111111] dark:hover:text-[#F5F7FA]'}`}
      aria-label={ariaLabel}
    >
      <NavIconWithBadge icon={icon} badge={badge} />
    </Link>
  );
}

interface SearchPillProps {
  href: string;
  isActive: boolean;
  mode: 'customer' | 'pro';
}

function SearchPill({ href, isActive, mode }: SearchPillProps) {
  const accentBg = mode === 'pro' ? 'bg-[#FFC067]/30 dark:bg-[#E8B15A]/25' : 'bg-[#B2FBA5]/40 dark:bg-[#9FE38F]/25';
  const accentText = mode === 'pro' ? 'text-[#B45309] dark:text-[#E8B15A]' : 'text-[#047857] dark:text-[#9FE38F]';
  const inactiveStyles = 'bg-[rgba(255,255,255,0.92)] dark:bg-[rgba(23,26,32,0.92)] text-[#111111] dark:text-[#F5F7FA] border-[#E5E5E5] dark:border-white/10';

  return (
    <Link
      href={href}
      className={`flex items-center justify-center gap-2 min-w-[110px] h-11 px-4 rounded-full font-medium text-sm border shadow-[0_2px_8px_rgba(0,0,0,0.08)] dark:shadow-[0_2px_12px_rgba(0,0,0,0.4)] backdrop-blur-md transition-all duration-150 active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-[#E5E5E5] dark:focus-visible:ring-white/20 focus-visible:ring-offset-2 focus:outline-none ${
        isActive ? `${accentBg} ${accentText} border-transparent` : `${inactiveStyles} hover:opacity-95`
      }`}
      aria-label="Search"
    >
      <Search size={20} strokeWidth={ICON_STROKE} className="shrink-0" />
      <span>Search</span>
    </Link>
  );
}

export default function BottomNav() {
  const pathname = usePathname();
  const { hasNewMessages } = useNavAlerts();
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

  /* theme-pro/theme-customer are set by root ThemeProvider from pathname */

  const homeHref = mode === 'pro' ? '/pro' : '/customer';
  const requestsHref = mode === 'pro' ? '/pro/requests' : '/customer/requests';
  const searchHref = '/occupations';
  const messagesHref = mode === 'pro' ? '/pro/messages' : '/customer/messages';
  const profileHref = mode === 'pro' ? '/pro/settings' : '/customer/settings';

  const iconClass = 'shrink-0 text-current [&>svg]:transition-colors';

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 pointer-events-none pb-[env(safe-area-inset-bottom)]">
      <div className="pointer-events-auto mx-auto flex items-center justify-center gap-2 px-4 pb-4 max-w-md">
        {/* Individual floating buttons - no shared background */}
        <SideTab
          href={homeHref}
          isActive={isActive(homeHref)}
          icon={<Home size={ICON_SIZE} strokeWidth={ICON_STROKE} className={iconClass} />}
          ariaLabel="Home"
          mode={mode}
        />
        <SideTab
          href={requestsHref}
          isActive={isActive(requestsHref)}
          icon={<ClipboardList size={ICON_SIZE} strokeWidth={ICON_STROKE} className={iconClass} />}
          ariaLabel="Requests"
          mode={mode}
        />
        <SearchPill href={searchHref} isActive={isActive(searchHref)} mode={mode} />
        <SideTab
          href={messagesHref}
          isActive={isActive(messagesHref)}
          icon={<MessageCircle size={ICON_SIZE} strokeWidth={ICON_STROKE} className={iconClass} />}
          badge={<NavAlertDot show={hasNewMessages} />}
          ariaLabel="Messages"
          mode={mode}
        />
        <SideTab
          href={profileHref}
          isActive={isActive(profileHref)}
          icon={<User size={ICON_SIZE} strokeWidth={ICON_STROKE} className={iconClass} />}
          ariaLabel="Profile"
          mode={mode}
        />
      </div>
    </div>
  );
}
