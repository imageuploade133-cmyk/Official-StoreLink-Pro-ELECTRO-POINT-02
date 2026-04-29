'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './auth-context';
import { useSettings } from './settings-context';
import { usePathname } from 'next/navigation';

interface GlobalLoadingContextType {
  isInitialLoadComplete: boolean;
  setPageDataLoaded: (loaded: boolean) => void;
  isPageDataLoaded: boolean;
}

const GlobalLoadingContext = createContext<GlobalLoadingContextType | undefined>(undefined);

export function GlobalLoadingProvider({ children }: { children: React.ReactNode }) {
  const { isLoading: isAuthLoading } = useAuth();
  const { isLoadingSettings } = useSettings();
  const [isPageDataLoaded, setPageDataLoaded] = useState(false);
  const pathname = usePathname();

  // Reset page data loaded state on route change
  useEffect(() => {
    setPageDataLoaded(false);
    
    // Auto-resolve after a safety timeout (e.g., 5 seconds) to prevent infinite loading
    // if a page doesn't implement the setPageDataLoaded(true) call.
    const timer = setTimeout(() => {
      setPageDataLoaded(true);
    }, 5000);
    
    return () => clearTimeout(timer);
  }, [pathname]);

  // The initial global load is complete when auth and settings have all been loaded,
  // AND the specific page data has finished loading (or timed out).
  const isInitialLoadComplete = !isAuthLoading && !isLoadingSettings && isPageDataLoaded;

  return (
    <GlobalLoadingContext.Provider value={{ isInitialLoadComplete, setPageDataLoaded, isPageDataLoaded }}>
      {children}
    </GlobalLoadingContext.Provider>
  );
}

export function useGlobalLoading() {
  const context = useContext(GlobalLoadingContext);
  if (context === undefined) {
    throw new Error('useGlobalLoading must be used within a GlobalLoadingProvider');
  }
  return context;
}
