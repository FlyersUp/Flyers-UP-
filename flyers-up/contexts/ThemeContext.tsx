'use client';

import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';

type ThemeMode = 'customer' | 'pro';
type ThemePreference = 'light' | 'dark' | 'system';

interface ThemeContextType {
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
  /**
   * User theme preference.
   * - light: force light mode
   * - dark: force dark mode
   * - system: follow OS preference
   */
  theme: ThemePreference;
  setTheme: (next: ThemePreference) => void;
  /**
   * Back-compat convenience boolean for existing UI.
   * Represents whether dark mode is currently enabled (after resolving `theme`).
   */
  darkMode: boolean;
  /**
   * Back-compat setter. For now this maps to `theme = 'dark' | 'light'`.
   */
  setDarkMode: (next: boolean) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ 
  children, 
  defaultMode = 'customer' 
}: { 
  children: React.ReactNode; 
  defaultMode?: ThemeMode;
}) {
  const [mode, setMode] = useState<ThemeMode>(defaultMode);
  const THEME_KEY = 'flyersup:theme';
  const DARK_KEY = 'flyersup:darkMode'; // legacy

  // Initialize from storage before first paint (avoids flicker + satisfies strict lint rules).
  const [theme, setTheme] = useState<ThemePreference>(() => {
    if (typeof window === 'undefined') return 'system';
    try {
      const rawTheme = window.localStorage.getItem(THEME_KEY);
      if (rawTheme === 'light' || rawTheme === 'dark' || rawTheme === 'system') return rawTheme;

      // Legacy fallback
      const rawDark = window.localStorage.getItem(DARK_KEY);
      if (rawDark === '1') return 'dark';
      if (rawDark === '0') return 'light';
    } catch {
      // ignore
    }
    return 'system';
  });

  const [systemDark, setSystemDark] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    try {
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    } catch {
      return false;
    }
  });

  // Track OS preference for `system`.
  useEffect(() => {
    try {
      const mq = window.matchMedia('(prefers-color-scheme: dark)');
      const onChange = (e: MediaQueryListEvent) => setSystemDark(e.matches);
      mq.addEventListener?.('change', onChange);
      // Safari fallback
      (mq as any).addListener?.(onChange);
      return () => {
        mq.removeEventListener?.('change', onChange);
        (mq as any).removeListener?.(onChange);
      };
    } catch {
      // ignore
      return;
    }
  }, []);

  const resolvedDark = theme === 'dark' ? true : theme === 'light' ? false : systemDark;

  // Apply classes + persist.
  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle('dark', resolvedDark);
    // Ensure the role theme class is always applied on the root element
    // so `--accent` resolves correctly everywhere.
    root.classList.toggle('theme-customer', mode === 'customer');
    root.classList.toggle('theme-pro', mode === 'pro');
    try {
      window.localStorage.setItem(THEME_KEY, theme);
      // Legacy key: only write when explicit (avoid freezing a stale value when using `system`).
      if (theme === 'dark') window.localStorage.setItem(DARK_KEY, '1');
      else if (theme === 'light') window.localStorage.setItem(DARK_KEY, '0');
      else window.localStorage.removeItem(DARK_KEY);
    } catch {
      // ignore
    }
  }, [resolvedDark, mode, theme]);

  const ctx = useMemo<ThemeContextType>(() => {
    return {
      mode,
      setMode,
      theme,
      setTheme,
      darkMode: resolvedDark,
      setDarkMode: (next) => setTheme(next ? 'dark' : 'light'),
    };
  }, [mode, theme, resolvedDark]);

  return (
    <ThemeContext.Provider value={ctx}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

