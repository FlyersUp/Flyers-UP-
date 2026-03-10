/**
 * Navigational card for admin operations tools.
 * Icon, title, short description, chevron, optional status pill.
 */

import Link from 'next/link';
import { ChevronRight } from 'lucide-react';

interface AdminToolCardProps {
  href: string;
  title: string;
  description: string;
  icon?: React.ReactNode;
  /** Optional status pill (e.g. "Live", "Beta") */
  status?: string;
}

export function AdminToolCard({ href, title, description, icon, status }: AdminToolCardProps) {
  return (
    <Link
      href={href}
      className="group flex items-start gap-3 rounded-2xl border border-black/5 bg-white p-4 shadow-sm transition-colors hover:bg-surface2/50"
    >
      {icon ? (
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-surface2 text-muted">
          {icon}
        </div>
      ) : null}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-text">{title}</span>
          {status ? (
            <span className="rounded-full bg-surface2 px-2 py-0.5 text-xs text-muted">{status}</span>
          ) : null}
        </div>
        <p className="mt-0.5 text-sm text-muted">{description}</p>
      </div>
      <ChevronRight className="h-5 w-5 shrink-0 text-muted group-hover:text-text" />
    </Link>
  );
}
