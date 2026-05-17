'use client';

import { useState, useEffect } from 'react';
import {
  onSnapshot,
  DocumentReference,
  DocumentData,
  FirestoreError,
} from 'firebase/firestore';
import { errorEmitter } from '../error-emitter';
import { FirestorePermissionError } from '../errors';

export function useDoc<T>(docRef: DocumentReference | null) {
  // We use the path as a stable dependency to avoid re-subscribing 
  // if the docRef object reference changes but points to the same document.
  const path = docRef?.path;

  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(!!path);
  const [error, setError] = useState<FirestoreError | null>(null);
  const [prevPath, setPrevPath] = useState<string | undefined>(path);

  // Immediate state update when path changes to avoid loading state mismatch during render
  if (path !== prevPath) {
    setPrevPath(path);
    setIsLoading(!!path);
    setData(null); // Clear old data when path changes
  }

  useEffect(() => {
    if (!docRef) {
      return;
    }

    const unsubscribe = onSnapshot(
      docRef,
      (snapshot) => {
        if (snapshot.exists()) {
          setData({ id: snapshot.id, ...snapshot.data() } as T);
        } else {
          setData(null);
        }
        setIsLoading(false);
        setError(null);
      },
      (err: FirestoreError) => {
        if (err.code === 'permission-denied') {
            const permissionError = new FirestorePermissionError({
              path: docRef.path,
              operation: 'get',
            });
            errorEmitter.emit('permission-error', permissionError);
        } else {
            console.error("Firestore doc fetch failed:", err);
            errorEmitter.emit('firestore-error', err);
        }

        setError(err);
        setIsLoading(false);
        setData(null);
      }
    );

    return () => unsubscribe();
  }, [path, docRef]); // Include docRef to satisfy ESLint, path ensures stability

  return { data, isLoading, error };
}
