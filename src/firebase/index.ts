
'use client';

// This file is the main entry point for CLIENT-SIDE firebase access.
// It re-exports things from other modules.

export { initializeFirebase } from './init';
export * from './provider';
export * from './auth/use-user';
export * from './firestore/use-collection';
export * from './firestore/use-doc';
export { default as firebaseConfig } from './config';
