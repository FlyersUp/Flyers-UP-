'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { getCurrentUser, type UserWithProfile } from '@/lib/api';
import { perfLog, perfNoteGetCurrentUser } from '@/lib/perfBoot';

type AppSessionContextValue = {
  user: UserWithProfile | null;
  /** True after the first getCurrentUser attempt finishes (success or anonymous). */
  resolved: boolean;
  refresh: () => Promise<void>;
};

const AppSessionContext = createContext<AppSessionContextValue | undefined>(undefined);

export function AppSessionProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserWithProfile | null>(null);
  const [resolved, setResolved] = useState(false);

  const refresh = useCallback(async () => {
    const t0 =
      typeof performance !== 'undefined' ? performance.now() : 0;
    perfNoteGetCurrentUser();
    const u = await getCurrentUser();
    if (typeof performance !== 'undefined') {
      perfLog('session resolved', performance.now() - t0);
    }
    setUser(u);
    setResolved(true);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const value = useMemo(
    () => ({
      user,
      resolved,
      refresh,
    }),
    [user, resolved, refresh]
  );

  return (
    <AppSessionContext.Provider value={value}>{children}</AppSessionContext.Provider>
  );
}

export function useAppSession(): AppSessionContextValue {
  const ctx = useContext(AppSessionContext);
  if (!ctx) {
    throw new Error('useAppSession must be used within AppSessionProvider');
  }
  return ctx;
}
