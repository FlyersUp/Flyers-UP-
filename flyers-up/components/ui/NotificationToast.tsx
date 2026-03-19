'use client';

/**
 * NotificationToast: Shows live notification with "Tap to view"
 * Rendered at app root; consumes ToastContext.
 */

import Link from 'next/link';
import { useToast } from '@/contexts/NotificationContext';

export function NotificationToast() {
  const { toast, dismissToast } = useToast();
  if (!toast) return null;

  const href = toast.deep_link || '/customer/notifications';

  return (
    <div
      className="fixed bottom-20 left-0 right-0 z-[100] p-4 pointer-events-auto"
      role="alert"
      aria-live="polite"
    >
      <Link
        href={href}
        onClick={dismissToast}
        className="block rounded-2xl border border-border bg-surface p-4 shadow-[var(--shadow-card)] transition-all hover:bg-hover/75 hover:shadow-[var(--shadow-card-hover)]"
      >
        <div className="font-semibold text-text">{toast.title}</div>
        {toast.body && (
          <div className="mt-1 line-clamp-2 text-sm text-text3">{toast.body}</div>
        )}
        <div className="mt-2 inline-flex items-center rounded-full bg-[hsl(var(--accent-customer)/0.18)] px-2.5 py-0.5 text-xs font-medium text-text2">
          Tap to view
        </div>
      </Link>
    </div>
  );
}
