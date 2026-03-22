'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';

type ThemeMode = 'light' | 'dark';

interface ThemeContextType {
  theme: ThemeMode;
  toggleTheme: () => void;
  setTheme: (theme: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeContextProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<ThemeMode>('light');
  const [isMounted, setIsMounted] = useState(false);

  // Initialize theme from localStorage on client-side only
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') as ThemeMode | null;
    const initialTheme = savedTheme || 'light';
    setThemeState(initialTheme);
    setIsMounted(true);
  }, []);

  // Update localStorage and DOM whenever theme changes
  useEffect(() => {
    if (!isMounted) return;
    
    localStorage.setItem('theme', theme);
    
    const root = window.document.documentElement;
    root.classList.remove('light', 'dark');
    root.classList.add(theme);
  }, [theme, isMounted]);

  const toggleTheme = () => {
    setThemeState(prev => prev === 'light' ? 'dark' : 'light');
  };

  const setTheme = (newTheme: ThemeMode) => {
    setThemeState(newTheme);
  };

  // Don't render children until mounted to avoid hydration mismatch
  if (!isMounted) {
    return <>{children}</>;
  }

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within ThemeContextProvider');
  }
  return context;
}
