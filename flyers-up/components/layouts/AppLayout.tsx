'use client';

import { ReactNode } from 'react';
import { Rail } from '@/components/ui/Rail';
import { ThemeProvider } from '@/contexts/ThemeContext';
import BottomNav from '@/components/BottomNav';

interface AppLayoutProps {
  children: ReactNode;
  mode?: 'customer' | 'pro';
  showRail?: boolean;
}

function LayoutContent({ children, showRail = true }: { children: ReactNode; showRail: boolean }) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-bg via-surface to-bg text-text flex pb-20">
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
export function AppLayout({ children, mode = 'customer', showRail = true }: AppLayoutProps) {
  return (
    <ThemeProvider defaultMode={mode}>
      <LayoutContent showRail={showRail}>
        {children}
      </LayoutContent>
    </ThemeProvider>
  );
}












