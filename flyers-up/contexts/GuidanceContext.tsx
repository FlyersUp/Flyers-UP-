'use client';

import { createContext, useContext, useCallback, useRef } from 'react';

export type GuidanceContextValue = {
  onboardingOpen: boolean;
  /** Hide contextual hints until resolved; also after tour done / session dismiss / legacy skip. */
  suppressContextualHints: boolean;
  /** Platform signup URL from session, or null if complete. */
  incompletePlatformSetupHref: string | null;
  showIncompletePlatformSetupInNav: boolean;
  dismissProductGuideForSession: () => void;
  clearProductGuideSessionDismissal: () => void;
  requestHintSlot: (hintKey: string) => boolean;
  releaseHintSlot: () => void;
};

const GuidanceContext = createContext<GuidanceContextValue | null>(null);

export function useGuidanceContext(): GuidanceContextValue | null {
  return useContext(GuidanceContext);
}

export function GuidanceContextProvider({
  children,
  value,
}: {
  children: React.ReactNode;
  value: GuidanceContextValue;
}) {
  return (
    <GuidanceContext.Provider value={value}>{children}</GuidanceContext.Provider>
  );
}
