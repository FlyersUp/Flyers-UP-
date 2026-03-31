'use client';

import { ReactNode } from 'react';
import { Rail } from '@/components/ui/Rail';
import { useAccentDensity } from '@/contexts/AccentDensityContext';
import { NavAlertsProvider } from '@/contexts/NavAlertsContext';
import { NotificationProvider } from '@/contexts/NotificationContext';
import OneSignalInit from '@/components/notifications/OneSignalInit';
import { NotificationToast } from '@/components/ui/NotificationToast';
import { NotificationBell } from '@/components/notifications/NotificationBell';
import FloatingBottomNav from '@/components/navigation/FloatingBottomNav';

interface AppLayoutProps {
  children: ReactNode;
  mode?: 'customer' | 'pro';
  showRail?: boolean;
  accentDensity?: 'default' | 'focus';
  /** When false, hide the fixed top-right bell (use inline header actions instead). */
  showFloatingNotificationBell?: boolean;
}

function LayoutContent({
  children,
  showRail = true,
  mode,
  accentDensity,
  showFloatingNotificationBell = true,
}: {
  children: ReactNode;
  showRail: boolean;
  mode: 'customer' | 'pro';
  accentDensity: 'default' | 'focus';
  showFloatingNotificationBell: boolean;
}) {
  const showRailForMode = showRail && mode === 'pro';
  const basePath = mode === 'pro' ? 'pro' : 'customer';

  return (
    <div
      data-role={mode}
      data-accent={accentDensity}
      className="min-h-dvh min-h-[100svh] w-full max-w-full overflow-x-clip bg-bg text-text flex pb-[calc(7rem+env(safe-area-inset-bottom,0px))]"
    >
      {showRailForMode && <Rail className="self-stretch min-h-dvh shrink-0" showLabel />}
      <div className="relative flex min-h-0 min-w-0 flex-1 flex-col before:pointer-events-none before:absolute before:inset-0 before:bg-[radial-gradient(circle_at_top_right,rgba(156,167,100,0.08),transparent_42%),radial-gradient(circle_at_bottom_left,rgba(229,156,92,0.07),transparent_46%)]">
        <div
          className="fixed right-4 z-30 max-w-[calc(100vw-2rem)]"
          style={{ top: 'max(1rem, env(safe-area-inset-top, 0px))' }}
        >
          <NotificationBell basePath={basePath} />
        </div>
        <div className="relative z-[1] min-h-0 min-w-0 flex-1">{children}</div>
      </div>
      <FloatingBottomNav />
    </div>
  );
}

/**
 * Main app layout with white left rail + colored stripe.
 * Accent density: prop overrides layout context (from AccentDensityProvider).
 * Focus mode (~25% accent) is used only on decision/commit layouts (e.g. booking flow).
 */
export function AppLayout({
  children,
  mode = 'customer',
  showRail = true,
  accentDensity: accentDensityProp,
  showFloatingNotificationBell = true,
}: AppLayoutProps) {
  const accentFromContext = useAccentDensity();
  const accentDensity = accentDensityProp ?? accentFromContext;
  return (
    <NavAlertsProvider>
      <NotificationProvider>
        <>
          <OneSignalInit />
          <LayoutContent
            showRail={showRail}
            mode={mode}
            accentDensity={accentDensity}
            showFloatingNotificationBell={showFloatingNotificationBell}
          >
            {children}
          </LayoutContent>
          <NotificationToast />
        </>
      </NotificationProvider>
    </NavAlertsProvider>
  );
}












