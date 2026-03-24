'use client';

import { createContext, useContext, useCallback, useRef } from 'react';

interface GuidanceContextValue {
  onboardingOpen: boolean;
  /** Request to show a hint; returns true if this hint gets the slot (only one at a time) */
  requestHintSlot: (hintKey: string) => boolean;
  releaseHintSlot: () => void;
}

const GuidanceContext = createContext<GuidanceContextValue | null>(null);

export function useGuidanceContext(): GuidanceContextValue | null {
  return useContext(GuidanceContext);
}

export function GuidanceContextProvider({
  children,
  onboardingOpen,
}: {
  children: React.ReactNode;
  onboardingOpen: boolean;
}) {
  const slotRef = useRef<string | null>(null);

  const requestHintSlot = useCallback((hintKey: string) => {
    if (slotRef.current === null || slotRef.current === hintKey) {
      slotRef.current = hintKey;
      return true;
    }
    return false;
  }, []);

  const releaseHintSlot = useCallback(() => {
    slotRef.current = null;
  }, []);

  const value: GuidanceContextValue = {
    onboardingOpen,
    requestHintSlot,
    releaseHintSlot,
  };

  return (
    <GuidanceContext.Provider value={value}>
      {children}
    </GuidanceContext.Provider>
  );
}
