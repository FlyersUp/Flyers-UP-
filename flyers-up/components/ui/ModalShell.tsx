'use client';

import { X } from 'lucide-react';
import { cn } from '@/lib/cn';

export function ModalShell({
  title,
  onClose,
  children,
  className,
  headerSlot,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  className?: string;
  headerSlot?: React.ReactNode;
}) {
  return (
    <div className="w-full max-w-lg rounded-2xl border border-border bg-surface shadow-[var(--shadow-card)]">
      <header className="flex items-center justify-between border-b border-border px-5 py-4">
        <div>
          <h2 className="text-base font-semibold text-foreground">{title}</h2>
          {headerSlot}
        </div>
        <button
          type="button"
          onClick={onClose}
          className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border bg-card text-muted-foreground transition-colors hover:bg-hover hover:text-foreground"
          aria-label="Close"
        >
          <X size={16} />
        </button>
      </header>
      <div className={cn('p-5', className)}>{children}</div>
    </div>
  );
}
