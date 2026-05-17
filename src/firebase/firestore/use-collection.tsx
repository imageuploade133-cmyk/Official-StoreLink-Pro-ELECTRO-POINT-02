'use client';
import { useState, useEffect } from 'react';
import {
  onSnapshot,
  Query,
  DocumentData,
  FirestoreError,
} from 'firebase/firestore';
import { errorEmitter } from '../error-emitter';
import { FirestorePermissionError } from '../errors';

export function useCollection<T>(query: Query | null) {
  const [data, setData] = useState<T[] | null>(null);
  const [isLoading, setIsLoading] = useState(!!query);
  const [error, setError] = useState<FirestoreError | null>(null);
  const [prevQuery, setPrevQuery] = useState<Query | null>(query);

  // Sync state with query change during render to avoid flashes of stale state
  if (query !== prevQuery) {
    setPrevQuery(query);
    setIsLoading(!!query);
    setData(null);
  }

  useEffect(() => {
    if (!query) {
      return;
    }

    const unsubscribe = onSnapshot(
      query,
      (snapshot) => {
        const documents = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt,
          updatedAt: doc.data().updatedAt,
        })) as T[];
        setData(documents);
        setIsLoading(false);
        setError(null);
      },
      (err: FirestoreError) => {
        // Only treat actual permission errors as such
        if (err.code === 'permission-denied') {
            let path = 'unknown_path';
            // This uses an internal property of the Firestore query object and may break in future SDK versions.
            if ((query as any)._query?.path?.segments) {
                path = (query as any)._query.path.segments.join('/');
            }
            
            const permissionError = new FirestorePermissionError({
              path: path,
              operation: 'list',
            });
            errorEmitter.emit('permission-error', permissionError);
        } else {
            // For other errors (like missing indexes), log them for debugging
            console.error("Firestore query failed:", err);
            errorEmitter.emit('firestore-error', err);
        }
        
        setError(err);
        setIsLoading(false);
        setData(null);
      }
    );

    return () => unsubscribe();
  }, [query]);

  return { data, isLoading, error };
}
