
import * as admin from 'firebase-admin';

if (!admin.apps.length) {
  try {
    const projectId = process.env.FIREBASE_PROJECT_ID || 'valentino-ice-cream';
    const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;

    if (serviceAccountKey) {
      try {
        // If service account is provided via environment variables
        const key = serviceAccountKey.startsWith('{') 
          ? JSON.parse(serviceAccountKey) 
          : JSON.parse(Buffer.from(serviceAccountKey, 'base64').toString());

        admin.initializeApp({
          credential: admin.credential.cert(key),
          projectId: projectId,
        });
        console.log('Firebase Admin initialized with FIREBASE_SERVICE_ACCOUNT_KEY');
      } catch (parseError) {
        console.error('Failed to parse FIREBASE_SERVICE_ACCOUNT_KEY. Ensure it is valid JSON or Base64 encoded JSON.');
        // Fallback to ADC
        if (!admin.apps.length) {
          admin.initializeApp({
            projectId: projectId,
          });
        }
      }
    } else {
      // Fallback to Application Default Credentials (ADC)
      admin.initializeApp({
        projectId: projectId,
      });
      console.log('Firebase Admin initialized with Application Default Credentials');
    }
  } catch (error) {
    console.error('Firebase admin initialization error', error);
  }
}

export const adminDb = admin.firestore();
export const adminAuth = admin.auth();
export const adminStorage = admin.storage();
