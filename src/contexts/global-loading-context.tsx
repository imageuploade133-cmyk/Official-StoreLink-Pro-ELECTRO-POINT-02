'use client';

import React, { createContext, useContext } from 'react';
import { useAuth } from './auth-context';
import { useSettings } from './settings-context';

interface GlobalLoadingContextType {
  isInitialLoadComplete: boolean;
}

const GlobalLoadingContext = createContext<GlobalLoadingContextType | undefined>(undefined);

export function GlobalLoadingProvider({ children }: { children: React.ReactNode }) {
  const { isLoading: isAuthLoading } = useAuth();
  const { isLoadingSettings } = useSettings();

  // The initial global load is complete when auth and settings have all been loaded.
  const isInitialLoadComplete = !isAuthLoading && !isLoadingSettings;

  return (
    <GlobalLoadingContext.Provider value={{ isInitialLoadComplete }}>
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
