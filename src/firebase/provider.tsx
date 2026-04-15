
'use client';

import React, { createContext, useContext, useMemo } from 'react';
import { FirebaseApp } from 'firebase/app';
import { Auth } from 'firebase/auth';
import { Firestore, getFirestore } from 'firebase/firestore';
import { FirebaseStorage } from 'firebase/storage';
import { initializeFirebase } from '.';
import { FirebaseErrorListener } from '@/components/FirebaseErrorListener';
import { StoreFirestoreContext } from './firestore/context';

interface FirebaseContextType {
  firebaseApp: FirebaseApp;
  auth: Auth;
  firestore: Firestore;
  storage: FirebaseStorage;
  getFirestoreInstance: (databaseId?: string) => Firestore;
}

const FirebaseContext = createContext<FirebaseContextType | null>(null);

export function FirebaseProvider({ children }: { children: React.ReactNode }) {
  const { firebaseApp, auth, firestore, storage } = useMemo(() => initializeFirebase(), []);

  const getFirestoreInstance = useMemo(() => (databaseId?: string) => {
    if (!databaseId || databaseId === '(default)') return firestore;
    return getFirestore(firebaseApp, databaseId);
  }, [firebaseApp, firestore]);

  return (
    <FirebaseContext.Provider value={{ firebaseApp, auth, firestore, storage, getFirestoreInstance }}>
      {children}
      <FirebaseErrorListener />
    </FirebaseContext.Provider>
  );
}

export const useFirebase = () => {
  const context = useContext(FirebaseContext);
  if (!context) {
    throw new Error('useFirebase must be used within a FirebaseProvider');
  }
  return context;
};

export const useFirebaseApp = () => useFirebase().firebaseApp;
export const useAuth = () => useFirebase().auth;
export const useFirestore = (databaseId?: string) => {
  const { firestore, getFirestoreInstance } = useFirebase();
  const storeFirestore = useContext(StoreFirestoreContext);

  if (databaseId) return getFirestoreInstance(databaseId);
  return storeFirestore || firestore;
};
export const useStorage = () => useFirebase().storage;


