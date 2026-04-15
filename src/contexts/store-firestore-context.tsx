'use client';

import React, { createContext, useContext, useMemo, useState, useEffect } from 'react';
import { Firestore } from 'firebase/firestore';
import { useAuth } from './auth-context';
import { useFirebase } from '@/firebase/provider';

import { StoreFirestoreContext } from '@/firebase/firestore/context';
import { errorEmitter } from '@/firebase/error-emitter';

export function StoreFirestoreProvider({ children }: { children: React.ReactNode }) {
  const { store } = useAuth();
  const { firestore: defaultFirestore, getFirestoreInstance } = useFirebase();
  const [fallbackToDefault, setFallbackToDefault] = useState(false);

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
    // Specifically block known invalid databases for this project to prevent immediate errors
    const isKnownInvalid = store?.databaseId === 'gano7777';

    if (!fallbackToDefault && !isKnownInvalid && store?.databaseId && store.databaseId !== '(default)') {
      try {
        return getFirestoreInstance(store.databaseId);
      } catch (e) {
        console.error("Failed to get Firestore instance:", e);
        return defaultFirestore;
      }
    }
    return defaultFirestore;
  }, [store?.databaseId, getFirestoreInstance, defaultFirestore, fallbackToDefault]);

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
