'use client';

import { Plus } from 'lucide-react';
import { cn } from '@/lib/cn';

export interface FloatingActionFabProps {
  onClick?: () => void;
  label?: string;
  className?: string;
}

export function FloatingActionFab({ onClick, label = 'Quick action', className }: FloatingActionFabProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className={cn(
        'fixed bottom-[calc(5.5rem+env(safe-area-inset-bottom))] right-4 z-20 flex h-14 w-14 items-center justify-center rounded-full bg-[hsl(var(--trust))] text-white shadow-lg shadow-[hsl(var(--trust))]/30 transition hover:opacity-95 active:scale-95',
        className
      )}
    >
      <Plus className="h-7 w-7" strokeWidth={2} />
    </button>
  );
}
