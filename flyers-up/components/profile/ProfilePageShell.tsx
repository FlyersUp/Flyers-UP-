import type { ReactNode } from 'react';

export function ProfilePageShell({
  children,
  maxWidth = '720px',
}: {
  children: ReactNode;
  maxWidth?: string;
}) {
  return (
    <div className="min-h-dvh min-h-[100svh] w-full max-w-full overflow-x-clip">
      <div
        className="mx-auto w-full min-w-0 max-w-full px-4 py-5 sm:px-5"
        style={{ maxWidth: `min(100%, ${maxWidth})` }}
      >
        {children}
      </div>
    </div>
  );
}

