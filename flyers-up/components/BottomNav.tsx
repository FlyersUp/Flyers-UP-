'use client';

/**
 * Bottom Navigation - Uber Eats style floating pill
 * Premium floating iOS-style tab bar with center Search action.
 * Light theme, soft shadow, rounded pill, visible page background around it.
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
      className="absolute -top-0.5 -right-1 w-2.5 h-2.5 rounded-full bg-red-500 dark:bg-[#F07A7A] border-2 border-white dark:border-[#222225] shrink-0"
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

  return (
    <Link
      href={href}
      className={`flex flex-col items-center justify-center w-12 h-12 rounded-full transition-all duration-150 active:scale-95 focus-visible:ring-2 focus-visible:ring-[#E5E5E5] dark:focus-visible:ring-white/20 focus-visible:ring-offset-2 focus:outline-none ${
        isActive ? accentColor : 'text-[#7A7A7A] dark:text-[#A1A1AA] hover:text-[#111111] dark:hover:text-[#F3F4F6]'
      }`}
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

  return (
    <Link
      href={href}
      className={`flex items-center justify-center gap-2 min-w-[120px] h-11 px-5 rounded-full font-medium text-sm transition-all duration-150 active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-[#E5E5E5] focus-visible:ring-offset-2 focus:outline-none ${
        isActive ? `${accentBg} ${accentText}` : 'bg-white/95 text-[#111111] border border-[#E5E5E5] shadow-sm hover:bg-white'
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

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle('theme-pro', mode === 'pro');
    root.classList.toggle('theme-customer', mode === 'customer');
  }, [mode]);

  const homeHref = mode === 'pro' ? '/pro' : '/customer';
  const requestsHref = mode === 'pro' ? '/pro/requests' : '/customer/requests';
  const searchHref = '/occupations';
  const messagesHref = mode === 'pro' ? '/pro/messages' : '/customer/messages';
  const profileHref = mode === 'pro' ? '/pro/settings' : '/customer/settings';

  const iconClass = 'shrink-0 text-current [&>svg]:transition-colors';

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 pointer-events-none pb-[env(safe-area-inset-bottom)]">
      <div className="pointer-events-auto mx-auto flex items-center justify-center px-4 pb-3 max-w-md">
        <nav
          className="flex items-center justify-between gap-1 px-3 py-2 rounded-full border border-[#E5E5E5] dark:border-white/10 bg-[rgba(255,255,255,0.92)] dark:bg-[#222225]/90 backdrop-blur-xl shadow-[0_8px_30px_rgba(0,0,0,0.10)] dark:shadow-[0_8px_30px_rgba(0,0,0,0.4)]"
          aria-label="Main navigation"
        >
          {/* Left: Home, Requests */}
          <div className="flex items-center gap-1">
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
          </div>

          {/* Center: Search pill */}
          <div className="mx-2">
            <SearchPill href={searchHref} isActive={isActive(searchHref)} mode={mode} />
          </div>

          {/* Right: Messages, Profile */}
          <div className="flex items-center gap-1">
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
        </nav>
      </div>
    </div>
  );
}
