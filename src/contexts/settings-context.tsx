'use client';

import React, { createContext, useContext, useMemo } from 'react';
import { useFirestore, useDoc } from '@/firebase';
import { doc } from 'firebase/firestore';
import type { Settings } from '@/lib/types';
import { useAuth } from './auth-context';

interface SettingsContextType {
  settings: Settings | null;
  isLoadingSettings: boolean;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const firestore = useFirestore();
  const { store, staffMember } = useAuth();

  const storeId = useMemo(() => staffMember?.store_id || store?.id, [staffMember, store]);

  const settingsRef = useMemo(
    () => {
        if (!firestore) return null;
        if (storeId) return doc(firestore, 'settings', storeId);
        return doc(firestore, 'settings', 'global');
    },
    [firestore, storeId]
  );

  const { data: settingsData, isLoading: isLoadingSettings } = useDoc<Settings>(settingsRef);

  const value = { settings: settingsData, isLoadingSettings };

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
}
