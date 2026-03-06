import type { ReactNode } from 'react';

export function ProfilePageShell({
  children,
  maxWidth = '720px',
}: {
  children: ReactNode;
  maxWidth?: string;
}) {
  return (
    <div className="min-h-screen">
      <div className="mx-auto w-full px-4 py-5" style={{ maxWidth }}>
        {children}
      </div>
    </div>
  );
}

