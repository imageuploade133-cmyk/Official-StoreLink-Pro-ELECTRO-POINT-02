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
    throw serverError;
  });
}

export function saveStoreSettings(
  firestore: Firestore,
  storeId: string,
  settings: Partial<Omit<Settings, 'id'>>
) {
  // We save to both locations during transition: 
  // 1. The old top-level collection
  // 2. The new subcollection (Recommended Refactor)
  const oldSettingsRef = doc(firestore, 'settings', storeId);
  const newSettingsRef = doc(firestore, 'stores', storeId, 'settings', 'config');
  
  return Promise.all([
    setDoc(oldSettingsRef, settings, { merge: true }),
    setDoc(newSettingsRef, settings, { merge: true })
  ]).catch((serverError) => {
    const permissionError = new FirestorePermissionError({
      path: newSettingsRef.path,
      operation: 'update',
      requestResourceData: settings,
    });
    errorEmitter.emit('permission-error', permissionError);
    throw serverError;
  });
}
