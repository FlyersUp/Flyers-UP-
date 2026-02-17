'use client';

import React, { createContext, useContext, ReactNode } from 'react';

export type AccentDensity = 'default' | 'focus';

const AccentDensityContext = createContext<AccentDensity | undefined>(undefined);

/**
 * Provider for layout-level accent density. Used by layouts that are
 * "decision/commit" screens (onboarding role selection, booking review/checkout)
 * to set data-accent="focus" (~25% accent) while the rest of the app stays "default" (~10–15%).
 *
 * ROUTES/LAYOUTS USING FOCUS MODE:
 * - app/onboarding/role/* (layout wrapper: data-accent="focus", no AppLayout)
 * - app/customer/booking/* (AccentDensityProvider value="focus" in layout;
 *   includes: service, schedule, review, payment, pay, success, paid)
 */
export function AccentDensityProvider({
  value,
  children,
}: {
  value: AccentDensity;
  children: ReactNode;
}) {
  return (
    <AccentDensityContext.Provider value={value}>
      {children}
    </AccentDensityContext.Provider>
  );
}

export function useAccentDensity(): AccentDensity {
  const context = useContext(AccentDensityContext);
  return context ?? 'default';
}
