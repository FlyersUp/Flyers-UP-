'use client';

import { useLaunchMode } from '@/hooks/useLaunchMode';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

/** Redirect when launch mode hides this route (client pages only). */
export function LaunchModeClientRedirect({ href }: { href: string }) {
  const launch = useLaunchMode();
  const router = useRouter();
  useEffect(() => {
    if (launch) router.replace(href);
  }, [launch, href, router]);
  return null;
}
