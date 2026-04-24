
import * as admin from 'firebase-admin';

if (!admin.apps.length) {
  try {
    const projectId = process.env.FIREBASE_PROJECT_ID || 'valentino-ice-cream';
    const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;

    if (serviceAccountKey) {
      try {
        // Handle potential quoting issues and whitespace
        const cleanedKey = serviceAccountKey.trim().replace(/^['"](.*)['"]$/, '$1');
        
        const key = cleanedKey.startsWith('{') 
          ? JSON.parse(cleanedKey) 
          : JSON.parse(Buffer.from(cleanedKey, 'base64').toString());

        // Ensure the private key has correct newline formatting
        if (key.private_key && typeof key.private_key === 'string') {
          key.private_key = key.private_key.replace(/\\n/g, '\n');
        }

        admin.initializeApp({
          credential: admin.credential.cert(key),
          projectId: projectId,
        });
        console.log('Firebase Admin initialized with FIREBASE_SERVICE_ACCOUNT_KEY');
      } catch (parseError) {
        console.error('Failed to parse FIREBASE_SERVICE_ACCOUNT_KEY:', parseError);
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
