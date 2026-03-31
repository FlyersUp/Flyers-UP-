import { type ReactNode } from 'react';
import { cn } from '@/lib/cn';

/**
 * Constrains page content to the viewport width and allows flex children to shrink (prevents
 * horizontal overflow on iPhone / PWA). Compose inside AppLayout or full-page shells.
 */
export function MobileScrollRoot({
  children,
  className,
  as: Tag = 'div',
}: {
  children: ReactNode;
  className?: string;
  as?: 'div' | 'main' | 'section';
}) {
  return <Tag className={cn('mobile-page-root', className)}>{children}</Tag>;
}
