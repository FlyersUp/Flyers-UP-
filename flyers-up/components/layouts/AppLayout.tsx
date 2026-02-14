'use client';

import { ReactNode } from 'react';
import { Rail } from '@/components/ui/Rail';
import { ThemeProvider } from '@/contexts/ThemeContext';
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
 * Main app layout with white left rail + colored stripe
 */
export function AppLayout({
  children,
  mode = 'customer',
  showRail = true,
  accentDensity = 'default',
}: AppLayoutProps) {
  return (
    <ThemeProvider defaultMode={mode}>
      <LayoutContent showRail={showRail} mode={mode} accentDensity={accentDensity}>
        {children}
      </LayoutContent>
    </ThemeProvider>
  );
}












