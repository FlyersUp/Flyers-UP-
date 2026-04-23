'use client';

import type { ReactNode } from 'react';
import { Bell, Search } from 'lucide-react';
import { AdminSidebar } from '@/components/hybrid/AdminSidebar';
import { cn } from '@/lib/cn';

export interface AdminPageShellProps {
  title: string;
  subtitle?: ReactNode;
  children: ReactNode;
  /** Extra filter chips row below subtitle */
  filters?: ReactNode;
  className?: string;
}

/** Desktop ops shell: navy sidebar + top bar + white content (mockup-aligned). */
export function AdminPageShell({ title, subtitle, children, filters, className }: AdminPageShellProps) {
  return (
    <div className={cn('flex min-h-screen bg-surface2', className)}>
      <AdminSidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-10 flex flex-wrap items-center gap-3 border-b border-border bg-surface px-6 py-3">
          <div className="relative min-w-[200px] max-w-xl flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-3" />
            <input
              type="search"
              placeholder="Search requests, pros, or locations…"
              className="h-10 w-full rounded-xl border border-border bg-surface2 pl-10 pr-3 text-sm text-text placeholder:text-text-3 focus:outline-none focus:ring-2 focus:ring-[hsl(var(--trust))]/20"
            />
          </div>
          <button
            type="button"
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-surface hover:bg-surface2"
            aria-label="Notifications"
          >
            <Bell className="h-5 w-5 text-text-3" />
          </button>
          <div className="h-9 w-9 rounded-full bg-[hsl(var(--trust))]/20 ring-2 ring-[hsl(var(--trust))]/25" aria-hidden />
        </header>
        <main className="flex-1 space-y-4 p-6">
          <div>
            <h1 className="text-2xl font-bold text-[hsl(var(--trust))]">{title}</h1>
            {subtitle ? <div className="mt-1 max-w-3xl text-sm text-text-3">{subtitle}</div> : null}
          </div>
          {filters}
          {children}
        </main>
      </div>
    </div>
  );
}
