'use client';

import React, { createContext, useContext, useMemo } from 'react';
import { Firestore } from 'firebase/firestore';
import { useAuth } from './auth-context';
import { useFirebase } from '@/firebase/provider';

import { StoreFirestoreContext } from '@/firebase/firestore/context';

export function StoreFirestoreProvider({ children }: { children: React.ReactNode }) {
  const { store } = useAuth();
  const { firestore: defaultFirestore, getFirestoreInstance } = useFirebase();

  const firestore = useMemo(() => {
    if (store?.databaseId && store.databaseId !== '(default)') {
      return getFirestoreInstance(store.databaseId);
    }
    return defaultFirestore;
  }, [store?.databaseId, getFirestoreInstance, defaultFirestore]);

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
