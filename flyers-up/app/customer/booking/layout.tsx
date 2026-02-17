'use client';

import { AccentDensityProvider } from '@/contexts/AccentDensityContext';

/**
 * AccentDensity: focus (commit/confirmation flow).
 * All routes under /customer/booking/* get higher accent density via context;
 * AppLayout reads this and sets data-accent="focus" on its wrapper.
 */
export default function CustomerBookingLayout({ children }: { children: React.ReactNode }) {
  return <AccentDensityProvider value="focus">{children}</AccentDensityProvider>;
}
