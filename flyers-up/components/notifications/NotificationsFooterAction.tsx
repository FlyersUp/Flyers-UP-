'use client';

/**
 * Lightweight footer action for the notifications panel.
 * Replaces heavy "View all notifications" styling.
 */

import Link from 'next/link';

interface NotificationsFooterActionProps {
  href: string;
  label: string;
  onClick?: () => void;
}

export function NotificationsFooterAction({
  href,
  label,
  onClick,
}: NotificationsFooterActionProps) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className="block py-2.5 text-center text-xs font-medium text-muted hover:text-text transition-colors"
    >
      {label}
    </Link>
  );
}
