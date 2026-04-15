import { createContext } from 'react';
import { Firestore } from 'firebase/firestore';

export const StoreFirestoreContext = createContext<Firestore | null>(null);
