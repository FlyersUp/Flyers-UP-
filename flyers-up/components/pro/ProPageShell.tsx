'use client';

import { ReactNode, useEffect, useState } from 'react';
import { SideMenu } from '@/components/ui/SideMenu';
import { getCurrentUser } from '@/lib/api';

interface ProPageShellProps {
  title: string;
  children: ReactNode;
  /** Optional: pass userName to skip fetch. If not provided, fetches from API. */
  userName?: string;
  /** Optional: subtitle below the main content area */
  subtitle?: string;
}

/**
 * Shared shell for pro pages: sticky header with hamburger menu, consistent with
 * CustomerDashboard and ProDashboard theme (light grey bg, uppercase sections, card styling).
 */
export function ProPageShell({ title, children, userName: userNameProp, subtitle }: ProPageShellProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [userName, setUserName] = useState(userNameProp ?? 'Account');

  useEffect(() => {
    if (userNameProp) {
      setUserName(userNameProp);
      return;
    }
    let mounted = true;
    getCurrentUser().then((user) => {
      if (!mounted || !user) return;
      const fallback = user.email?.split('@')[0] ?? 'Account';
      const full = [user.first_name?.trim(), user.last_name?.trim()].filter(Boolean).join(' ');
      setUserName(full || fallback);
    });
    return () => { mounted = false; };
  }, [userNameProp]);

  return (
    <div className="min-h-screen bg-[#F5F5F5]">
      <div className="sticky top-0 z-20 bg-[#F5F5F5]/95 backdrop-blur-sm border-b border-black/10">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <button
            type="button"
            onClick={() => setMenuOpen(true)}
            className="h-10 w-10 rounded-xl bg-[#F5F5F5] border border-black/10 text-black/70 hover:bg-[#EBEBEB]"
            aria-label="Open menu"
          >
            ☰
          </button>
          <h1 className="text-xl font-semibold text-[#111]">{title}</h1>
          <div className="w-10" />
        </div>
      </div>

      <div className="pb-24">
        {subtitle && (
          <div className="max-w-4xl mx-auto px-4 pt-4">
            <p className="text-sm text-black/60">{subtitle}</p>
          </div>
        )}
        {children}
      </div>
      <SideMenu open={menuOpen} onClose={() => setMenuOpen(false)} mode="pro" userName={userName} />
    </div>
  );
}
