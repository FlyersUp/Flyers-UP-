'use client';

import Link from 'next/link';
import { Menu } from 'lucide-react';
import { cn } from '@/lib/cn';

export interface HybridAppHeaderProps {
  /** Show hamburger (e.g. opens SideMenu elsewhere) */
  onMenuClick?: () => void;
  className?: string;
  /** Optional right slot instead of default avatar */
  rightSlot?: React.ReactNode;
}

/**
 * Customer mobile top bar — Flyers Up wordmark, menu, avatar (mockup-aligned).
 */
export function HybridAppHeader({ onMenuClick, className, rightSlot }: HybridAppHeaderProps) {
  return (
    <header
      className={cn(
        'flex items-center justify-between gap-3 px-4 pt-[max(0.75rem,env(safe-area-inset-top))] pb-3',
        className
      )}
    >
      <Link href="/customer/hybrid" className="text-lg font-bold tracking-tight text-[hsl(var(--trust))]">
        Flyers Up
      </Link>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onMenuClick}
          className="flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-surface text-text hover:bg-surface2"
          aria-label="Menu"
        >
          <Menu className="h-5 w-5" strokeWidth={2} />
        </button>
        {rightSlot ?? (
          <div
            className="h-10 w-10 rounded-full border border-border bg-surface2 ring-2 ring-[hsl(var(--trust))]/15"
            aria-hidden
          />
        )}
      </div>
    </header>
  );
}
