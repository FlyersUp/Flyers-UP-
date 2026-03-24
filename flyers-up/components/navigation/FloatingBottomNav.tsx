'use client';

/**
 * FloatingBottomNav - Morphing floating nav
 * Active item becomes a pill (icon + label); inactive items stay as small circles.
 * No shared dock. Each button floats independently with smooth transitions.
 * Pro: Home, Jobs, Messages, Profile (4 items)
 * Customer: Home, Explore, Messages, Profile (4 items)
 * Labels from lib/guidance/nav-labels.ts — single source of truth.
 */

import Link from 'next/link';
import { NAV_LABELS } from '@/lib/guidance/nav-labels';
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
      className="absolute -top-0.5 -right-1 h-2.5 w-2.5 shrink-0 rounded-full border-2 border-surface bg-accentOrange"
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
  mode: 'customer' | 'pro';
}

function MorphingNavItem({ href, isActive, icon, label, badge, ariaLabel, mode }: MorphingNavItemProps) {
  const base =
    'flex items-center justify-center h-12 sm:h-14 rounded-full border backdrop-blur-md overflow-hidden ' +
    'active:scale-95 focus-visible:ring-2 focus-visible:ring-offset-2 focus:outline-none ' +
    'focus-visible:ring-[var(--ring-green)] focus-visible:ring-offset-bg ' +
    'shadow-[var(--shadow-2)] ' +
    'transition-colors duration-[220ms] ease-out';

  const inactiveBg = 'bg-surface/95';
  const inactiveBorder = 'border-border';
  const inactiveIcon = 'text-text3';

  const activeBg = mode === 'pro' ? 'bg-[hsl(var(--accent-pro)/0.22)]' : 'bg-[hsl(var(--accent-customer)/0.22)]';
  const activeBorder = mode === 'pro' ? 'border-[hsl(var(--accent-pro)/0.58)]' : 'border-[hsl(var(--accent-customer)/0.58)]';
  const activeIcon = 'text-text';

  return (
    <Link
      href={href}
      className={`${base} ${isActive ? activeBg : inactiveBg} ${isActive ? activeBorder : inactiveBorder} ${
        isActive ? activeIcon : `${inactiveIcon} hover:text-text hover:bg-hover`
      }`}
      style={{
        width: isActive ? 104 : 48,
        minWidth: isActive ? 88 : 48,
        paddingLeft: isActive ? 14 : 0,
        paddingRight: isActive ? 14 : 0,
        gap: isActive ? 6 : 0,
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
        className="whitespace-nowrap font-medium text-xs sm:text-sm overflow-hidden"
        style={{
          maxWidth: isActive ? 64 : 0,
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
  const labels = NAV_LABELS[mode];

  if (mode === 'pro') {
    return (
      <div className="fixed inset-x-0 bottom-0 z-50 pointer-events-none flex justify-center">
        <div
          className="pointer-events-auto flex items-center justify-center gap-2 sm:gap-3 px-3 sm:px-4 max-w-md"
          style={{ marginBottom: 'max(12px, env(safe-area-inset-bottom))' }}
        >
          <MorphingNavItem
            href={homeHref}
            isActive={isActive(homeHref, true)}
            icon={<Home size={ICON_SIZE} strokeWidth={ICON_STROKE} className={iconClass} />}
            label={labels.home}
            ariaLabel={labels.home}
            mode={mode}
          />
          <MorphingNavItem
            href={jobsHref}
            isActive={isActive(jobsHref)}
            icon={<Briefcase size={ICON_SIZE} strokeWidth={ICON_STROKE} className={iconClass} />}
            label={labels.jobs}
            ariaLabel={labels.jobs}
            mode={mode}
          />
          <MorphingNavItem
            href={messagesHref}
            isActive={isActive(messagesHref)}
            icon={<MessageCircle size={ICON_SIZE} strokeWidth={ICON_STROKE} className={iconClass} />}
            label={labels.messages}
            badge={<NavAlertDot show={hasNewMessages} />}
            ariaLabel={labels.messages}
            mode={mode}
          />
          <MorphingNavItem
            href={profileHref}
            isActive={isActive(profileHref)}
            icon={<User size={ICON_SIZE} strokeWidth={ICON_STROKE} className={iconClass} />}
            label={labels.profile}
            ariaLabel={labels.profile}
            mode={mode}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 pointer-events-none flex justify-center">
      <div
        className="pointer-events-auto flex items-center justify-center gap-2 sm:gap-3 px-3 sm:px-4 max-w-md"
        style={{ marginBottom: 'max(12px, env(safe-area-inset-bottom))' }}
      >
        <MorphingNavItem
          href={homeHref}
          isActive={isActive(homeHref, true)}
          icon={<Home size={ICON_SIZE} strokeWidth={ICON_STROKE} className={iconClass} />}
          label={labels.home}
          ariaLabel={labels.home}
          mode={mode}
        />
        <MorphingNavItem
          href={exploreHref}
          isActive={isActive(exploreHref)}
          icon={<Compass size={ICON_SIZE} strokeWidth={ICON_STROKE} className={iconClass} />}
          label={labels.explore}
          ariaLabel={labels.explore}
          mode={mode}
        />
        <MorphingNavItem
          href={messagesHref}
          isActive={isActive(messagesHref)}
          icon={<MessageCircle size={ICON_SIZE} strokeWidth={ICON_STROKE} className={iconClass} />}
          label={labels.messages}
          badge={<NavAlertDot show={hasNewMessages} />}
          ariaLabel={labels.messages}
          mode={mode}
        />
        <MorphingNavItem
          href={profileHref}
          isActive={isActive(profileHref)}
          icon={<User size={ICON_SIZE} strokeWidth={ICON_STROKE} className={iconClass} />}
          label={labels.profile}
          ariaLabel={labels.profile}
          mode={mode}
        />
      </div>
    </div>
  );
}
