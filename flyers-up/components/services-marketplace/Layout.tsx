'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';
import {
  Calendar,
  CalendarDays,
  Inbox,
  LayoutDashboard,
  MessageSquare,
  Search,
  Settings,
  Sparkles,
  User,
} from 'lucide-react';

/** Premium warm marketplace palette (use with restraint) */
export const marketplace = {
  cta: '#E48C35',
  accent: '#F5B74E',
  base: '#EBCEAE',
  mutedSurface: '#E0AF70',
  trust: '#AAA06D',
  slate: '#5D695D',
} as const;

export type LayoutMode = 'landing' | 'dashboard';

export type LayoutProps = {
  mode: LayoutMode;
  children: ReactNode;
  /** Dashboard: which sidebar item is active */
  dashboardActiveId?: 'overview' | 'bookings' | 'requests' | 'messages' | 'calendar' | 'settings';
  className?: string;
};

const dashNav = [
  { id: 'overview' as const, label: 'Overview', href: '#', icon: LayoutDashboard },
  { id: 'bookings' as const, label: 'Bookings', href: '#', icon: Calendar },
  { id: 'requests' as const, label: 'Requests', href: '#', icon: Inbox },
  { id: 'messages' as const, label: 'Messages', href: '#', icon: MessageSquare },
  { id: 'calendar' as const, label: 'Calendar', href: '#', icon: CalendarDays },
  { id: 'settings' as const, label: 'Settings', href: '#', icon: Settings },
];

/**
 * Shared app shell: landing top nav + footer, or dashboard sidebar + main.
 * Branding is Flyers Up throughout. Surfaces use layered warm tones; slate green for structural chrome.
 */
export function Layout({
  mode,
  children,
  dashboardActiveId = 'overview',
  className = '',
}: LayoutProps) {
  const slate = marketplace.slate;
  const cta = marketplace.cta;

  if (mode === 'landing') {
    return (
      <div
        className={`min-h-dvh flex flex-col bg-[#EBCEAE] text-[#5D695D] antialiased ${className}`}
        style={{ fontFamily: 'ui-sans-serif, system-ui, sans-serif' }}
      >
        <header className="sticky top-0 z-50 border-b border-[#5D695D]/12 bg-[#EBCEAE]/90 backdrop-blur-md">
          <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
            <Link
              href="#"
              className="flex items-center gap-2 rounded-xl px-2 py-1 text-[#5D695D] transition-colors hover:bg-[#5D695D]/5"
              aria-label="Flyers Up home"
            >
              <span
                className="flex h-9 w-9 items-center justify-center rounded-xl shadow-sm"
                style={{ backgroundColor: slate, color: '#F8F4EE' }}
              >
                <Sparkles className="h-5 w-5" strokeWidth={2} />
              </span>
              <span className="text-lg font-semibold tracking-tight">Flyers Up</span>
            </Link>

            <nav className="hidden items-center gap-1 md:flex" aria-label="Flyers Up primary">
              {['Browse', 'How it works', 'For pros'].map((label) => (
                <Link
                  key={label}
                  href="#"
                  className="rounded-xl px-3 py-2 text-sm font-medium text-[#5D695D]/85 transition-colors hover:bg-[#5D695D]/8 hover:text-[#5D695D]"
                >
                  {label}
                </Link>
              ))}
            </nav>

            <div className="flex items-center gap-2 sm:gap-3">
              <button
                type="button"
                className="hidden rounded-xl border border-[#5D695D]/15 bg-[#F8F4EE]/40 px-3 py-2 text-sm font-medium text-[#5D695D] shadow-sm transition hover:border-[#5D695D]/25 hover:bg-[#F8F4EE]/70 sm:inline-flex"
              >
                Sign in
              </button>
              <button
                type="button"
                className="rounded-xl px-4 py-2.5 text-sm font-semibold text-white shadow-md transition hover:brightness-105 active:scale-[0.98]"
                style={{ backgroundColor: cta, boxShadow: '0 4px 14px rgba(228, 140, 53, 0.35)' }}
              >
                Get started
              </button>
            </div>
          </div>
        </header>

        <main className="flex-1">{children}</main>

        <footer className="border-t border-[#5D695D]/12 bg-[#5D695D] text-[#F0EBE3]">
          <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
            <div className="flex flex-col gap-8 md:flex-row md:items-start md:justify-between">
              <div>
                <p className="text-lg font-semibold tracking-tight text-white">Flyers Up</p>
                <p className="mt-2 max-w-sm text-sm text-[#F0EBE3]/75">
                  Flyers Up connects you with trusted local help for your home and life—vetted pros, clear pricing, peace
                  of mind.
                </p>
              </div>
              <div className="flex flex-wrap gap-8 text-sm">
                <div className="space-y-2">
                  <p className="font-semibold text-white/95">Company</p>
                  <ul className="space-y-1.5 text-[#F0EBE3]/70">
                    <li>
                      <Link href="#" className="rounded-lg hover:text-white">
                        About
                      </Link>
                    </li>
                    <li>
                      <Link href="#" className="rounded-lg hover:text-white">
                        Careers
                      </Link>
                    </li>
                  </ul>
                </div>
                <div className="space-y-2">
                  <p className="font-semibold text-white/95">Support</p>
                  <ul className="space-y-1.5 text-[#F0EBE3]/70">
                    <li>
                      <Link href="#" className="rounded-lg hover:text-white">
                        Help center
                      </Link>
                    </li>
                    <li>
                      <Link href="#" className="rounded-lg hover:text-white">
                        Trust & safety
                      </Link>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
            <p className="mt-10 border-t border-white/10 pt-8 text-center text-xs text-[#F0EBE3]/55">
              © {new Date().getFullYear()} Flyers Up. All rights reserved.
            </p>
          </div>
        </footer>
      </div>
    );
  }

  /* Dashboard */
  return (
    <div
      className={`min-h-dvh flex bg-[#EBCEAE] text-[#5D695D] antialiased ${className}`}
      style={{ fontFamily: 'ui-sans-serif, system-ui, sans-serif' }}
    >
      <aside
        className="hidden w-64 shrink-0 flex-col border-r border-white/10 shadow-xl md:flex"
        style={{ backgroundColor: slate }}
      >
        <div className="flex h-16 items-center gap-2 border-b border-white/10 px-5">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/10 text-[#F8F4EE]">
            <Sparkles className="h-4 w-4" strokeWidth={2} />
          </span>
          <span className="text-lg font-semibold tracking-tight text-white">Flyers Up</span>
        </div>

        <nav className="flex flex-1 flex-col gap-0.5 p-3" aria-label="Flyers Up dashboard">
          {dashNav.map(({ id, label, href, icon: Icon }) => {
            const active = id === dashboardActiveId;
            return (
              <Link
                key={id}
                href={href}
                className={[
                  'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all',
                  active
                    ? 'bg-white/14 text-white shadow-sm ring-1 ring-white/20'
                    : 'text-[#E8E4DC]/85 hover:bg-white/8 hover:text-white',
                ].join(' ')}
              >
                <Icon className={`h-5 w-5 shrink-0 ${active ? 'text-[#F5B74E]' : 'text-[#C9C4B8]'}`} strokeWidth={2} />
                {label}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-white/10 p-3">
          <button
            type="button"
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium text-[#E8E4DC]/90 transition hover:bg-white/8 hover:text-white"
          >
            <User className="h-5 w-5" strokeWidth={2} />
            Account
          </button>
        </div>
      </aside>

      {/* Mobile top bar */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header
          className="flex h-14 items-center justify-between border-b border-[#5D695D]/10 px-4 md:hidden"
          style={{ backgroundColor: slate }}
        >
          <span className="text-base font-semibold text-white">Flyers Up</span>
          <button
            type="button"
            className="rounded-xl p-2 text-white/90 hover:bg-white/10"
            aria-label="Search"
          >
            <Search className="h-5 w-5" />
          </button>
        </header>

        <main className="min-h-0 flex-1 overflow-auto">{children}</main>
      </div>
    </div>
  );
}
