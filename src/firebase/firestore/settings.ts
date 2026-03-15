'use client';
import { doc, setDoc, Firestore } from 'firebase/firestore';
import { errorEmitter } from '../error-emitter';
import { FirestorePermissionError } from '../errors';
import type { Settings } from '@/lib/types';

export function saveGlobalSettings(
  firestore: Firestore,
  settings: Partial<Omit<Settings, 'id'>>
) {
  const settingsRef = doc(firestore, 'settings', 'global');
  return setDoc(settingsRef, settings, { merge: true }).catch((serverError) => {
    const permissionError = new FirestorePermissionError({
      path: settingsRef.path,
      operation: 'update',
      requestResourceData: settings,
    });
    errorEmitter.emit('permission-error', permissionError);
    // It's important to re-throw the error or handle it here
    // so the UI can be notified of the failure.
    throw serverError;
  });
}
