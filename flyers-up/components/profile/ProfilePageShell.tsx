import type { ReactNode } from 'react';

export function ProfilePageShell({
  children,
  maxWidth = '720px',
}: {
  children: ReactNode;
  maxWidth?: string;
}) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-bg via-surface to-bg text-text">
      <div className="mx-auto w-full px-4 py-5" style={{ maxWidth }}>
        {children}
      </div>
    </div>
  );
}

