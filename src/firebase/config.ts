import { FirebaseOptions } from 'firebase/app';

// Your web app's Firebase configuration
const firebaseConfig: FirebaseOptions = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyDXzlVJe5u2tyUuP0A_KMCZf11rzTWYmwY",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "studio-8326245272-397a9.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "studio-8326245272-397a9",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "studio-8326245272-397a9.firebasestorage.app",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "354162779804",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:354162779804:web:be8da4c8588285a98c2f59",
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID || undefined,
};

export default firebaseConfig;
