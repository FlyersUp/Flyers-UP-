'use client';

import { ReactNode } from 'react';
import { Rail } from '@/components/ui/Rail';
import { ThemeProvider, useTheme } from '@/contexts/ThemeContext';

interface AppLayoutProps {
  children: ReactNode;
  mode?: 'customer' | 'pro';
  showRail?: boolean;
}

function LayoutContent({ children, showRail = true }: { children: ReactNode; showRail: boolean }) {
  return (
    <div className="min-h-screen bg-[#FEFBF8] flex">
      {showRail && <Rail className="h-screen" showLabel />}
      <div className="flex-1">
        {children}
      </div>
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












