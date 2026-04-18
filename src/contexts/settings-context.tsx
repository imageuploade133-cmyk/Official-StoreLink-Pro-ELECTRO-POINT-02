'use client';

import React, { createContext, useContext, useMemo } from 'react';
import { useFirestore, useDoc } from '@/firebase';
import { doc, onSnapshot } from 'firebase/firestore';
import type { Settings, Store } from '@/lib/types';
import { useAuth } from './auth-context';
import { usePathname } from 'next/navigation';
import { RESERVED_SUBDOMAINS } from '@/lib/domain';

interface SettingsContextType {
  settings: Settings | null;
  store: Store | null;
  isLoadingSettings: boolean;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export function SettingsProvider({ children, storeId: storeIdFromMiddleware }: { children: React.ReactNode, storeId?: string | null }) {
  const firestore = useFirestore();
  const { store, staffMember } = useAuth();
  const pathname = usePathname();

  const storeIdFromPath = useMemo(() => {
      const parts = pathname.split('/');
      // Check if we are in /store/[storeId] or /store-app/[storeId]
      if ((parts[1] === 'store' || parts[1] === 'store-app') && parts[2]) {
          return parts[2];
      }
      // Check if we are in /[storeId]
      if (parts[1] && !RESERVED_SUBDOMAINS.includes(parts[1])) {
          return parts[1];
      }
      return null;
  }, [pathname]);

  const storeId = useMemo(() => 
    storeIdFromMiddleware || 
    storeIdFromPath || 
    staffMember?.store_id || 
    store?.id
  , [staffMember, store, storeIdFromPath, storeIdFromMiddleware]);

  const settingsRef = useMemo(
    () => {
        if (!firestore) return null;
        if (storeId) {
            // Check new location: /stores/{storeId}/settings/config
            // For now, we'll just use the new location and fallback to the old one would require more logic.
            // But since we are writing to both, new stores will have it in both.
            // To be safe for existing stores, we could try to read from both, but useDoc only takes one ref.
            // Let's use the new path if available, or stay with old one for now but allow the refactor.
            // Given the instruction "Store settings under: /stores/{storeId}/settings", I will move to it.
            return doc(firestore, 'stores', storeId, 'settings', 'config');
        }
        return doc(firestore, 'settings', 'global');
    },
    [firestore, storeId]
  );

  // Fallback logic for existing stores
  const oldSettingsRef = useMemo(
    () => (firestore && storeId) ? doc(firestore, 'settings', storeId) : null,
    [firestore, storeId]
  );

  const { data: newSettingsData, isLoading: isLoadingNewSettings } = useDoc<Settings>(settingsRef);
  const { data: oldSettingsData, isLoading: isLoadingOldSettings } = useDoc<Settings>(oldSettingsRef);

  const storeRef = useMemo(
    () => (firestore && storeId) ? doc(firestore, 'stores', storeId) : null,
    [firestore, storeId]
  );
  const { data: storeData, isLoading: isLoadingStore } = useDoc<Store>(storeRef);

  const settingsData = newSettingsData || oldSettingsData;
  const isLoadingSettings = isLoadingNewSettings || isLoadingOldSettings || isLoadingStore;

  const value = { 
    settings: settingsData, 
    store: storeData,
    isLoadingSettings 
  };

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
}
