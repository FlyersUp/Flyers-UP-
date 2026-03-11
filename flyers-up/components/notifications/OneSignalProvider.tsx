'use client';

/**
 * Fetches current user and initializes OneSignal when logged in.
 * Renders inside AppLayout so it only runs for authenticated app routes.
 */

import OneSignalInit from './OneSignalInit';

export function OneSignalProvider({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <OneSignalInit />
    </>
  );
}
