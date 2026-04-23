'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Layers, MapPinned, Tag, Users } from 'lucide-react';
import { cn } from '@/lib/cn';

const NAV = [
  { href: '/admin', label: 'Overview', icon: LayoutDashboard },
  { href: '/admin/hybrid/match-queue', label: 'Match Queue', icon: Layers },
  { href: '/admin/hybrid/borough-health', label: 'Borough Health', icon: MapPinned },
  { href: '/admin/hybrid/pro-availability', label: 'Pro Availability', icon: Users },
  { href: '/admin/categories', label: 'Categories', icon: Tag },
] as const;

export interface AdminSidebarProps {
  className?: string;
}

export function AdminSidebar({ className }: AdminSidebarProps) {
  const pathname = usePathname();

  return (
    <aside
      className={cn(
        'flex w-56 shrink-0 flex-col border-r border-white/10 bg-[hsl(222_44%_22%)] text-white min-h-screen',
        className
      )}
    >
      <div className="border-b border-white/10 px-4 py-5">
        <p className="text-lg font-bold tracking-tight">Flyers Up</p>
        <p className="mt-0.5 text-[10px] font-medium uppercase tracking-wider text-white/50">Operations</p>
      </div>
      <nav className="flex flex-1 flex-col gap-0.5 p-2">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || (href !== '/admin' && pathname.startsWith(href));
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                active ? 'bg-white/10 text-white' : 'text-white/70 hover:bg-white/5 hover:text-white'
              )}
            >
              <Icon className="h-4 w-4 shrink-0 opacity-90" />
              {label}
            </Link>
          );
        })}
      </nav>
      <div className="p-3">
        <button
          type="button"
          className="w-full rounded-xl bg-[hsl(var(--action))] px-3 py-2.5 text-sm font-semibold text-[hsl(var(--action-foreground))] hover:opacity-95"
        >
          Post update
        </button>
      </div>
    </aside>
  );
}
