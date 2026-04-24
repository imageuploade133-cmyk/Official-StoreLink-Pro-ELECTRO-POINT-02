
import * as admin from 'firebase-admin';
import * as fs from 'fs';
import * as path from 'path';

if (!admin.apps.length) {
  try {
    const projectId = process.env.FIREBASE_PROJECT_ID || 'valentino-ice-cream';
    const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;

    let key: any;

    if (serviceAccountKey) {
      try {
        // Handle potential quoting issues and whitespace
        const cleanedKey = serviceAccountKey.trim().replace(/^['"](.*)['"]$/, '$1');
        
        key = cleanedKey.startsWith('{') 
          ? JSON.parse(cleanedKey) 
          : JSON.parse(Buffer.from(cleanedKey, 'base64').toString());
      } catch (parseError) {
        console.error('Failed to parse FIREBASE_SERVICE_ACCOUNT_KEY env var:', parseError);
      }
    }

    // Fallback to serviceAccountKey.json file if env var failed or was missing
    if (!key) {
      const filePath = path.join(process.cwd(), 'serviceAccountKey.json');
      if (fs.existsSync(filePath)) {
        try {
          key = JSON.parse(fs.readFileSync(filePath, 'utf8'));
          console.log('Firebase Admin: Using credentials from serviceAccountKey.json');
        } catch (fileError) {
          console.error('Failed to read serviceAccountKey.json:', fileError);
        }
      }
    }

    if (key) {
      // Ensure the private key has correct newline formatting
      if (key.private_key && typeof key.private_key === 'string') {
        key.private_key = key.private_key.replace(/\\n/g, '\n');
      }

      admin.initializeApp({
        credential: admin.credential.cert(key),
        projectId: projectId,
      });
      console.log('Firebase Admin initialized with service account credentials');
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
