'use client';

/**
 * FloatingBottomNav - Independent floating buttons, no shared dock
 * Each nav item floats separately with spacing between them.
 * Pro: Home, Jobs (center pill), Messages, Profile
 * Customer: Home, Requests, Search (center pill), Messages, Profile
 * Theme: light = rgba(255,255,255,0.95), #E5E5E5, #111; dark = rgba(23,26,32,0.95), rgba(255,255,255,0.08), #F5F7FA
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
  Briefcase,
} from 'lucide-react';
import { useNavAlerts } from '@/contexts/NavAlertsContext';

const SIDE_ICON_SIZE = 24;
const CENTER_ICON_SIZE = 22;
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

/* Theme requirements: light bg rgba(255,255,255,0.95) border #E5E5E5 text #111; dark bg rgba(23,26,32,0.95) border rgba(255,255,255,0.08) text #F5F7FA */
const SIDE_BTN_BASE =
  'flex items-center justify-center h-14 w-14 rounded-full border backdrop-blur-md transition-all duration-200 active:scale-95 focus-visible:ring-2 focus-visible:ring-offset-2 focus:outline-none ' +
  'bg-[rgba(255,255,255,0.95)] dark:bg-[rgba(23,26,32,0.95)] ' +
  'border-[#E5E5E5] dark:border-white/[0.08] ' +
  'text-[#111111] dark:text-[#F5F7FA] ' +
  'shadow-[0_2px_8px_rgba(0,0,0,0.08)] dark:shadow-[0_2px_12px_rgba(0,0,0,0.4)] ' +
  'focus-visible:ring-gray-300 dark:focus-visible:ring-white/20';

interface SideTabProps {
  href: string;
  isActive: boolean;
  icon: ReactNode;
  badge?: ReactNode;
  ariaLabel: string;
  mode: 'customer' | 'pro';
}

function SideTab({ href, isActive, icon, badge, ariaLabel, mode }: SideTabProps) {
  const accentColor = mode === 'pro' ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400';
  const inactiveColor = 'text-gray-600 dark:text-gray-400';

  return (
    <Link
      href={href}
      className={`${SIDE_BTN_BASE} ${isActive ? accentColor : inactiveColor + ' hover:text-[#111111] dark:hover:text-[#F5F7FA]'}`}
      aria-label={ariaLabel}
    >
      <NavIconWithBadge icon={icon} badge={badge} />
    </Link>
  );
}

interface CenterPillProps {
  href: string;
  isActive: boolean;
  mode: 'customer' | 'pro';
  label: string;
  icon: ReactNode;
  ariaLabel: string;
}

function CenterPill({ href, isActive, mode, label, icon, ariaLabel }: CenterPillProps) {
  const accentBg = mode === 'pro' ? 'bg-[#FFEBB0] dark:bg-amber-900/40' : 'bg-emerald-100 dark:bg-emerald-900/30';
  const accentText = mode === 'pro' ? 'text-amber-900 dark:text-amber-200' : 'text-emerald-800 dark:text-emerald-300';
  const inactiveStyles =
    'bg-[rgba(255,255,255,0.95)] dark:bg-[rgba(23,26,32,0.95)] text-[#111111] dark:text-[#F5F7FA] border-[#E5E5E5] dark:border-white/[0.08]';

  return (
    <Link
      href={href}
      className={`flex items-center justify-center gap-2 h-14 min-w-[130px] px-5 rounded-full font-medium text-sm border backdrop-blur-md transition-all duration-200 active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-gray-300 dark:focus-visible:ring-white/20 focus-visible:ring-offset-2 focus:outline-none ${
        isActive ? `${accentBg} ${accentText} border-transparent` : `${inactiveStyles} hover:opacity-95`
      } shadow-[0_2px_10px_rgba(0,0,0,0.1)] dark:shadow-[0_2px_14px_rgba(0,0,0,0.45)]`}
      aria-label={ariaLabel}
    >
      {icon}
      <span>{label}</span>
    </Link>
  );
}

export default function FloatingBottomNav() {
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

  const homeHref = mode === 'pro' ? '/pro' : '/customer';
  const jobsHref = mode === 'pro' ? '/pro/jobs' : '/customer/requests';
  const searchHref = '/occupations';
  const messagesHref = mode === 'pro' ? '/pro/messages' : '/customer/messages';
  const profileHref = mode === 'pro' ? '/pro/settings' : '/customer/settings';

  const iconClass = 'shrink-0 text-current [&>svg]:transition-colors';

  /* Pro: center = Jobs (4 items). Customer: center = Search (5 items). */
  const centerPill =
    mode === 'pro' ? (
      <CenterPill
        href={jobsHref}
        isActive={isActive(jobsHref)}
        mode="pro"
        label="Jobs"
        icon={<Briefcase size={CENTER_ICON_SIZE} strokeWidth={ICON_STROKE} className={iconClass} />}
        ariaLabel="Jobs"
      />
    ) : (
      <CenterPill
        href={searchHref}
        isActive={isActive(searchHref)}
        mode="customer"
        label="Search"
        icon={<Search size={CENTER_ICON_SIZE} strokeWidth={ICON_STROKE} className={iconClass} />}
        ariaLabel="Search"
      />
    );

  /* Independent floating buttons - no shared dock wrapper */
  const containerStyle = { marginBottom: 'max(12px, env(safe-area-inset-bottom))' };

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 pointer-events-none flex justify-center">
      <div
        className="pointer-events-auto flex items-center justify-center gap-3 px-4"
        style={containerStyle}
      >
        <SideTab
          href={homeHref}
          isActive={isActive(homeHref)}
          icon={<Home size={SIDE_ICON_SIZE} strokeWidth={ICON_STROKE} className={iconClass} />}
          ariaLabel="Home"
          mode={mode}
        />
        {mode === 'customer' && (
          <SideTab
            href={jobsHref}
            isActive={isActive(jobsHref)}
            icon={<ClipboardList size={SIDE_ICON_SIZE} strokeWidth={ICON_STROKE} className={iconClass} />}
            ariaLabel="Requests"
            mode={mode}
          />
        )}
        {centerPill}
        <SideTab
          href={messagesHref}
          isActive={isActive(messagesHref)}
          icon={<MessageCircle size={SIDE_ICON_SIZE} strokeWidth={ICON_STROKE} className={iconClass} />}
          badge={<NavAlertDot show={hasNewMessages} />}
          ariaLabel="Messages"
          mode={mode}
        />
        <SideTab
          href={profileHref}
          isActive={isActive(profileHref)}
          icon={<User size={SIDE_ICON_SIZE} strokeWidth={ICON_STROKE} className={iconClass} />}
          ariaLabel="Profile"
          mode={mode}
        />
      </div>
    </div>
  );
}
