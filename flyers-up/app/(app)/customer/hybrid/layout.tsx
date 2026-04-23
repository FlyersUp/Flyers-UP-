import type { ReactNode } from 'react';

/** Demo / marketing-aligned hybrid flows — max width for mobile-first editorial layouts */
export default function CustomerHybridLayout({ children }: { children: ReactNode }) {
  return <div className="mx-auto w-full max-w-md min-w-0">{children}</div>;
}
