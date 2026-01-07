'use client';

import React, { createContext, useContext, useState } from 'react';

type ThemeMode = 'customer' | 'pro';

interface ThemeContextType {
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
  primaryColor: string;
  primaryColorDark: string;
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

  const primaryColor = mode === 'customer' ? '#A8E6CF' : '#FFD3A1';
  const primaryColorDark = mode === 'customer' ? '#7FD4B0' : '#FFB870';

  return (
    <ThemeContext.Provider value={{ mode, setMode, primaryColor, primaryColorDark }}>
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

