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

const ICON_SIZE = 20;
const ICON_STROKE = 1.75;
const TRANSITION_MS = 220;

function NavAlertDot({ show }: { show: boolean }) {
  if (!show) return null;
  return (
    <span
      className="absolute -top-0.5 -right-1 h-2.5 w-2.5 shrink-0 rounded-full border-2 border-surface bg-action"
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
    'flex items-center justify-center h-11 sm:h-14 rounded-full border backdrop-blur-md overflow-hidden ' +
    'active:scale-95 focus-visible:ring-2 focus-visible:ring-offset-2 focus:outline-none ' +
    'focus-visible:ring-trust/45 focus-visible:ring-offset-bg ' +
    'shadow-[var(--shadow-2)] ' +
    'transition-colors duration-[220ms] ease-out';

  const inactiveBg = 'bg-surface/95';
  const inactiveBorder = 'border-border';
  const inactiveIcon = 'text-text3';

  const activeBg = 'bg-[hsl(var(--trust)/0.2)]';
  const activeBorder = 'border-[hsl(var(--trust)/0.45)]';
  const activeIcon = 'text-text';

  return (
    <Link
      href={href}
      className={`shrink-0 ${base} ${isActive ? activeBg : inactiveBg} ${isActive ? activeBorder : inactiveBorder} ${
        isActive ? activeIcon : `${inactiveIcon} hover:text-text hover:bg-hover`
      }`}
      style={{
        width: isActive ? 90 : 44,
        minWidth: isActive ? 78 : 44,
        paddingLeft: isActive ? 10 : 0,
        paddingRight: isActive ? 10 : 0,
        gap: isActive ? 5 : 0,
        transition: `min-width ${TRANSITION_MS}ms ease-out, width ${TRANSITION_MS}ms ease-out, padding ${TRANSITION_MS}ms ease-out, gap ${TRANSITION_MS}ms ease-out, background-color ${TRANSITION_MS}ms, color ${TRANSITION_MS}ms`,
      }}
      aria-label={ariaLabel}
      aria-current={isActive ? 'page' : undefined}
    >
      <NavIconWithBadge
        icon={icon}
        badge={badge}
      />
      {isActive ? (
        <span className="max-w-[4.5rem] truncate font-medium text-[0.7rem] sm:max-w-none sm:text-sm sm:whitespace-nowrap">
          {label}
        </span>
      ) : null}
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
    const labels = NAV_LABELS.pro;
    return (
      <div className="fixed inset-x-0 bottom-0 z-50 pointer-events-none flex justify-center safe-area-x isolate">
        <div
          className="fu-no-scrollbar pointer-events-auto flex w-full max-w-full min-w-0 items-center justify-center gap-1 overflow-x-visible px-3 sm:gap-3 sm:px-4 md:max-w-md"
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

  const labels = NAV_LABELS.customer;
  return (
    <div className="fixed inset-x-0 bottom-0 z-50 pointer-events-none flex justify-center safe-area-x isolate">
      <div
        className="fu-no-scrollbar pointer-events-auto flex w-full max-w-full min-w-0 items-center justify-center gap-1 overflow-x-visible px-3 sm:gap-3 sm:px-4 md:max-w-md"
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
