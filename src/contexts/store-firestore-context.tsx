'use client';

import React, { createContext, useContext, useMemo, useState, useEffect } from 'react';
import { Firestore, doc, getDoc } from 'firebase/firestore';
import { useAuth } from './auth-context';
import { useFirebase } from '@/firebase/provider';
import { usePathname } from 'next/navigation';

import { StoreFirestoreContext } from '@/firebase/firestore/context';
import { errorEmitter } from '@/firebase/error-emitter';

export function StoreFirestoreProvider({ children }: { children: React.ReactNode }) {
  const { store } = useAuth();
  const { firestore: defaultFirestore, getFirestoreInstance } = useFirebase();
  const [fallbackToDefault, setFallbackToDefault] = useState(false);
  const pathname = usePathname();
  const [urlStore, setUrlStore] = useState<{ databaseId?: string } | null>(null);

  const storeIdFromPath = useMemo(() => {
    const parts = pathname.split('/');
    if ((parts[1] === 'store' || parts[1] === 'store-app') && parts[2]) {
        return parts[2];
    }
    return null;
  }, [pathname]);

  useEffect(() => {
      if (storeIdFromPath && !store) {
          // Fetch store data to get databaseId for non-logged in users
          getDoc(doc(defaultFirestore, 'stores', storeIdFromPath)).then(snap => {
              if (snap.exists()) {
                  setUrlStore(snap.data() as any);
              }
          });
      } else {
          setUrlStore(null);
      }
  }, [storeIdFromPath, store, defaultFirestore]);

  useEffect(() => {
    const handleError = (error: any) => {
      // Check for "database does not exist" error
      // The error message usually contains "does not exist" or "not found"
      if (error?.message?.includes('does not exist') || error?.code === 'not-found') {
        console.warn("Firestore database not found, falling back to default.", error);
        setFallbackToDefault(true);
      }
    };

    errorEmitter.on('firestore-error', handleError);
    return () => errorEmitter.off('firestore-error', handleError);
  }, []);

  // Reset fallback when store changes
  useEffect(() => {
    setFallbackToDefault(false);
  }, [store?.id]);

  const firestore = useMemo(() => {
    const databaseId = store?.databaseId || urlStore?.databaseId;
    
    // Specifically block known invalid databases for this project to prevent immediate errors
    const isKnownInvalid = databaseId === 'gano7777' || databaseId === 'yyyyy';

    if (!fallbackToDefault && !isKnownInvalid && databaseId && databaseId !== '(default)') {
      try {
        return getFirestoreInstance(databaseId);
      } catch (e) {
        console.error("Failed to get Firestore instance:", e);
        return defaultFirestore;
      }
    }
    return defaultFirestore;
  }, [store?.databaseId, urlStore?.databaseId, getFirestoreInstance, defaultFirestore, fallbackToDefault]);

  return (
    <StoreFirestoreContext.Provider value={firestore}>
      {children}
    </StoreFirestoreContext.Provider>
  );
}

export const useStoreFirestore = () => {
  const context = useContext(StoreFirestoreContext);
  const { firestore: defaultFirestore } = useFirebase();
  return context || defaultFirestore;
};
