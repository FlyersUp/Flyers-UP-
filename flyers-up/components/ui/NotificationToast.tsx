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
        className="block surface-card border border-[var(--border-accent)] border-l-4 border-l-accent rounded-lg p-4 shadow-lg hover:opacity-90 transition-opacity"
      >
        <div className="font-semibold text-text">{toast.title}</div>
        {toast.body && (
          <div className="text-sm text-muted mt-1 line-clamp-2">{toast.body}</div>
        )}
        <div className="text-xs text-accent mt-2 font-medium">Tap to view</div>
      </Link>
    </div>
  );
}
