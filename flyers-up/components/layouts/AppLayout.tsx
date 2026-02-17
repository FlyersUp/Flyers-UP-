'use client';

import { ReactNode } from 'react';
import { Rail } from '@/components/ui/Rail';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { useAccentDensity } from '@/contexts/AccentDensityContext';
import BottomNav from '@/components/BottomNav';

interface AppLayoutProps {
  children: ReactNode;
  mode?: 'customer' | 'pro';
  showRail?: boolean;
  accentDensity?: 'default' | 'focus';
}

function LayoutContent({
  children,
  showRail = true,
  mode,
  accentDensity,
}: {
  children: ReactNode;
  showRail: boolean;
  mode: 'customer' | 'pro';
  accentDensity: 'default' | 'focus';
}) {
  return (
    <div
      data-role={mode}
      data-accent={accentDensity}
      className="min-h-screen bg-gradient-to-b from-bg via-surface to-bg text-text flex pb-20"
    >
      {showRail && <Rail className="h-screen" showLabel />}
      <div className="flex-1">
        {children}
      </div>
      <BottomNav />
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
}: AppLayoutProps) {
  const accentFromContext = useAccentDensity();
  const accentDensity = accentDensityProp ?? accentFromContext;
  return (
    <ThemeProvider defaultMode={mode}>
      <LayoutContent showRail={showRail} mode={mode} accentDensity={accentDensity}>
        {children}
      </LayoutContent>
    </ThemeProvider>
  );
}












