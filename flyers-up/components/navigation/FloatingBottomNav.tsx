'use client';

/**
 * FloatingBottomNav - Morphing floating nav
 * Active item becomes a pill (icon + label); inactive items stay as small circles.
 * No shared dock. Each button floats independently with smooth transitions.
 * Pro: Home, Jobs, Messages, Profile (4 items)
 * Customer: Home, Explore, Messages, Profile (4 items)
 */

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState, ReactNode } from 'react';
import {
  Home,
  MessageCircle,
  User,
  Briefcase,
  Compass,
} from 'lucide-react';
import { useNavAlerts } from '@/contexts/NavAlertsContext';

const ICON_SIZE = 22;
const ICON_STROKE = 1.75;
const TRANSITION_MS = 220;

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
    <span className="relative inline-flex shrink-0">
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
    pathname?.startsWith('/requests') ||
    pathname?.startsWith('/occupations')
  )
    return 'customer';
  return null;
}

/* Morphing nav item: circle when inactive, pill when active */
interface MorphingNavItemProps {
  href: string;
  isActive: boolean;
  icon: ReactNode;
  label: string;
  badge?: ReactNode;
  ariaLabel: string;
}

function MorphingNavItem({ href, isActive, icon, label, badge, ariaLabel }: MorphingNavItemProps) {
  const base =
    'flex items-center justify-center h-14 rounded-full border backdrop-blur-md overflow-hidden ' +
    'active:scale-95 focus-visible:ring-2 focus-visible:ring-offset-2 focus:outline-none ' +
    'focus-visible:ring-gray-300 dark:focus-visible:ring-white/20 ' +
    'shadow-[0_2px_8px_rgba(0,0,0,0.08)] dark:shadow-[0_2px_12px_rgba(0,0,0,0.4)] ' +
    'transition-colors duration-[220ms] ease-out';

  const inactiveBg = 'bg-[rgba(255,255,255,0.95)] dark:bg-[rgba(23,26,32,0.95)]';
  const inactiveBorder = 'border-[#E5E5E5] dark:border-white/[0.08]';
  const inactiveIcon = 'text-[#6B7280] dark:text-[#A1A8B3]';

  const activeBg = 'bg-[rgba(255,255,255,0.98)] dark:bg-[rgba(29,33,40,0.98)]';
  const activeBorder = 'border-[#E5E5E5] dark:border-white/[0.08]';
  const activeIcon = 'text-[#111111] dark:text-[#F5F7FA]';

  return (
    <Link
      href={href}
      className={`${base} ${isActive ? activeBg : inactiveBg} ${isActive ? activeBorder : inactiveBorder} ${
        isActive ? activeIcon : inactiveIcon + ' hover:text-[#111111] dark:hover:text-[#F5F7FA]'
      }`}
      style={{
        width: isActive ? 132 : 56,
        minWidth: isActive ? 120 : 56,
        paddingLeft: isActive ? 20 : 0,
        paddingRight: isActive ? 20 : 0,
        gap: isActive ? 8 : 0,
        transition: `min-width ${TRANSITION_MS}ms ease-out, width ${TRANSITION_MS}ms ease-out, padding ${TRANSITION_MS}ms ease-out, gap ${TRANSITION_MS}ms ease-out, background-color ${TRANSITION_MS}ms, color ${TRANSITION_MS}ms`,
      }}
      aria-label={ariaLabel}
      aria-current={isActive ? 'page' : undefined}
    >
      <NavIconWithBadge
        icon={icon}
        badge={badge}
      />
      <span
        className="whitespace-nowrap font-medium text-sm overflow-hidden"
        style={{
          maxWidth: isActive ? 80 : 0,
          opacity: isActive ? 1 : 0,
          transition: `max-width ${TRANSITION_MS}ms ease-out, opacity ${TRANSITION_MS}ms ease-out`,
        }}
      >
        {label}
      </span>
    </Link>
  );
}

export default function FloatingBottomNav() {
  const pathname = usePathname();
  const { hasNewMessages } = useNavAlerts();
  const pathMode = getModeFromPath(pathname);
  const [storageMode, setStorageMode] = useState<'customer' | 'pro'>('customer');
  const mode: 'customer' | 'pro' = pathMode ?? storageMode;
  const isActive = (path: string, exact?: boolean) =>
    exact ? pathname === path : pathname === path || pathname?.startsWith(path + '/');

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
  const jobsHref = '/pro/jobs';
  const exploreHref = '/occupations';
  const messagesHref = mode === 'pro' ? '/pro/messages' : '/customer/messages';
  const profileHref = mode === 'pro' ? '/pro/settings' : '/customer/settings';

  const iconClass = 'shrink-0 text-current';

  if (mode === 'pro') {
    /* Pro: 4 items - Home, Jobs, Messages, Profile. Active item morphs to pill. */
    return (
      <div className="fixed inset-x-0 bottom-0 z-50 pointer-events-none flex justify-center">
        <div
          className="pointer-events-auto flex items-center justify-center gap-3 px-4 max-w-md"
          style={{ marginBottom: 'max(12px, env(safe-area-inset-bottom))' }}
        >
          <MorphingNavItem
            href={homeHref}
            isActive={isActive(homeHref, true)}
            icon={<Home size={ICON_SIZE} strokeWidth={ICON_STROKE} className={iconClass} />}
            label="Home"
            ariaLabel="Home"
          />
          <MorphingNavItem
            href={jobsHref}
            isActive={isActive(jobsHref)}
            icon={<Briefcase size={ICON_SIZE} strokeWidth={ICON_STROKE} className={iconClass} />}
            label="Jobs"
            ariaLabel="Jobs"
          />
          <MorphingNavItem
            href={messagesHref}
            isActive={isActive(messagesHref)}
            icon={<MessageCircle size={ICON_SIZE} strokeWidth={ICON_STROKE} className={iconClass} />}
            label="Messages"
            badge={<NavAlertDot show={hasNewMessages} />}
            ariaLabel="Messages"
          />
          <MorphingNavItem
            href={profileHref}
            isActive={isActive(profileHref)}
            icon={<User size={ICON_SIZE} strokeWidth={ICON_STROKE} className={iconClass} />}
            label="Profile"
            ariaLabel="Profile"
          />
        </div>
      </div>
    );
  }

  /* Customer: 4 items - Home, Explore, Messages, Profile. Same morphing pattern as Pro. */
  return (
    <div className="fixed inset-x-0 bottom-0 z-50 pointer-events-none flex justify-center">
      <div
        className="pointer-events-auto flex items-center justify-center gap-3 px-4 max-w-md"
        style={{ marginBottom: 'max(12px, env(safe-area-inset-bottom))' }}
      >
        <MorphingNavItem
          href={homeHref}
          isActive={isActive(homeHref, true)}
          icon={<Home size={ICON_SIZE} strokeWidth={ICON_STROKE} className={iconClass} />}
          label="Home"
          ariaLabel="Home"
        />
        <MorphingNavItem
          href={exploreHref}
          isActive={isActive(exploreHref)}
          icon={<Compass size={ICON_SIZE} strokeWidth={ICON_STROKE} className={iconClass} />}
          label="Explore"
          ariaLabel="Explore"
        />
        <MorphingNavItem
          href={messagesHref}
          isActive={isActive(messagesHref)}
          icon={<MessageCircle size={ICON_SIZE} strokeWidth={ICON_STROKE} className={iconClass} />}
          label="Messages"
          badge={<NavAlertDot show={hasNewMessages} />}
          ariaLabel="Messages"
        />
        <MorphingNavItem
          href={profileHref}
          isActive={isActive(profileHref)}
          icon={<User size={ICON_SIZE} strokeWidth={ICON_STROKE} className={iconClass} />}
          label="Profile"
          ariaLabel="Profile"
        />
      </div>
    </div>
  );
}
