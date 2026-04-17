
import * as admin from 'firebase-admin';

if (!admin.apps.length) {
  try {
    const projectId = process.env.FIREBASE_PROJECT_ID || 'valentino-ice-cream';
    const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;

    if (serviceAccountKey) {
      // If service account is provided via environment variables
      admin.initializeApp({
        credential: admin.credential.cert(JSON.parse(serviceAccountKey)),
        projectId: projectId,
      });
    } else {
      // Fallback to Application Default Credentials (ADC)
      admin.initializeApp({
        projectId: projectId,
      });
    }
  } catch (error) {
    console.error('Firebase admin initialization error', error);
  }
}

export const adminDb = admin.firestore();
export const adminAuth = admin.auth();
export const adminStorage = admin.storage();
