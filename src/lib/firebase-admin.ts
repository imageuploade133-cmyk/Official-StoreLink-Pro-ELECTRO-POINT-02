import * as admin from 'firebase-admin';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Singleton Firebase Admin instance management for Next.js
 */
function getAdminApp(): admin.app.App {
  // Check if Firebase Admin is already initialized
  if (admin.apps.length > 0) {
    return admin.apps[0]!;
  }

  const projectId =
    process.env.FIREBASE_PROJECT_ID ||
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ||
    'studio-8326245272-397a9';

  const serviceAccountKeyEnv =
    process.env.FIREBASE_SERVICE_ACCOUNT_KEY ||
    process.env.FIREBASE_SERVICE_ACCOUNT_JSON ||
    process.env.FIREBASE_SERVICE_ACCOUNT ||
    process.env.FIREBASE_ADMIN_SERVICE_ACCOUNT ||
    process.env.FIREBASE_CREDENTIALS ||
    process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON;

  let serviceAccount: any = null;
  let initMethod = '';

  console.log(`Firebase Admin: Attempting initialization for project ${projectId}`);

  // Helper to parse JSON string safely
  const tryParseJson = (rawStr: string) => {
    try {
      let str = rawStr.trim();
      if ((str.startsWith('"') && str.endsWith('"')) || (str.startsWith("'") && str.endsWith("'"))) {
        str = str.slice(1, -1);
      }
      str = str.replace(/\\\\n/g, '\n').replace(/\\n/g, '\n');
      return JSON.parse(str);
    } catch (e) {
      return null;
    }
  };

  // 1. Try parsing from FIREBASE_SERVICE_ACCOUNT_KEY or aliases (JSON or Base64 or File Path)
  if (serviceAccountKeyEnv && serviceAccountKeyEnv !== 'undefined' && serviceAccountKeyEnv !== 'null') {
    const cleanedKey = serviceAccountKeyEnv.trim();
    
    // Check if it's a JSON string
    serviceAccount = tryParseJson(cleanedKey);
    if (serviceAccount) {
      initMethod = 'environment variable (JSON)';
    }

    // Check if it might be Base64
    if (!serviceAccount) {
      try {
        const decoded = Buffer.from(cleanedKey, 'base64').toString('utf8');
        serviceAccount = tryParseJson(decoded);
        if (serviceAccount) {
          initMethod = 'environment variable (Base64)';
        }
      } catch (e) {
        // Not Base64
      }
    }

    // Check if it's a file path
    if (!serviceAccount) {
      try {
        if (fs.existsSync(cleanedKey)) {
          serviceAccount = JSON.parse(fs.readFileSync(cleanedKey, 'utf8'));
          initMethod = `file path from env (${cleanedKey})`;
        }
      } catch (e) {
        // Not a valid file path
      }
    }
  }

  // 2. Try constructing from individual env vars: FIREBASE_CLIENT_EMAIL + FIREBASE_PRIVATE_KEY
  if (!serviceAccount) {
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL || process.env.NEXT_PUBLIC_FIREBASE_CLIENT_EMAIL;
    let privateKey = process.env.FIREBASE_PRIVATE_KEY || process.env.NEXT_PUBLIC_FIREBASE_PRIVATE_KEY;

    console.log(`Firebase Admin: Checking individual env vars. Email: ${clientEmail ? 'SET' : 'MISSING'}, PrivateKey: ${privateKey ? 'SET' : 'MISSING'}`);

    if (clientEmail && privateKey && projectId) {
      if ((privateKey.startsWith('"') && privateKey.endsWith('"')) || (privateKey.startsWith("'") && privateKey.endsWith("'"))) {
        privateKey = privateKey.slice(1, -1);
      }
      const formattedPrivateKey = privateKey.replace(/\\\\n/g, '\n').replace(/\\n/g, '\n');
      serviceAccount = {
        project_id: projectId,
        client_email: clientEmail,
        private_key: formattedPrivateKey,
      };
      initMethod = 'individual env vars (FIREBASE_CLIENT_EMAIL + FIREBASE_PRIVATE_KEY)';
    }
  }

  // 3. Fallback: Try reading from serviceAccountKey.json in the project root
  if (!serviceAccount) {
    try {
      const rootPath = process.cwd();
      const fallbackPaths = [
        path.join(rootPath, 'serviceAccountKey.json'),
        path.join(rootPath, 'config', 'serviceAccountKey.json'),
        path.join(rootPath, 'src', 'lib', 'serviceAccountKey.json')
      ];

      for (const filePath of fallbackPaths) {
        if (fs.existsSync(filePath)) {
          serviceAccount = JSON.parse(fs.readFileSync(filePath, 'utf8'));
          initMethod = `local file (${filePath})`;
          break;
        }
      }
    } catch (e) {
      console.error('Firebase Admin: Error checking for local serviceAccountKey.json:', e);
    }
  }

  // Final initialization
  try {
    if (serviceAccount && (serviceAccount.private_key || serviceAccount.privateKey)) {
      // Standardize private key field name and format
      const privateKey = serviceAccount.private_key || serviceAccount.privateKey;
      if (typeof privateKey === 'string') {
        serviceAccount.private_key = privateKey.replace(/\\\\n/g, '\n').replace(/\\n/g, '\n');
      }

      const initializedApp = admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        projectId: projectId,
      });
      
      console.log(`Firebase Admin initialized successfully via ${initMethod}`);
      return initializedApp;
    } else {
      console.warn('Firebase Admin: No cert credentials found. Attempting ADC initialization for project:', projectId);
      try {
        const initializedApp = admin.initializeApp({
          projectId: projectId,
        });
        console.log('Firebase Admin initialized with default ADC');
        return initializedApp;
      } catch (adcError) {
        const diag = {
            FIREBASE_SERVICE_ACCOUNT_KEY: process.env.FIREBASE_SERVICE_ACCOUNT_KEY ? 'SET' : 'MISSING',
            FIREBASE_SERVICE_ACCOUNT_JSON: process.env.FIREBASE_SERVICE_ACCOUNT_JSON ? 'SET' : 'MISSING',
            FIREBASE_CLIENT_EMAIL: process.env.FIREBASE_CLIENT_EMAIL ? 'SET' : 'MISSING',
            FIREBASE_PRIVATE_KEY: process.env.FIREBASE_PRIVATE_KEY ? 'SET' : 'MISSING',
            FIREBASE_PROJECT_ID: process.env.FIREBASE_PROJECT_ID ? 'SET' : 'MISSING',
            cwd: process.cwd(),
            filesChecked: ['serviceAccountKey.json', 'config/serviceAccountKey.json', 'src/lib/serviceAccountKey.json']
        };

        console.error('Firebase Admin: Initialization failed. Diagnostics:', JSON.stringify(diag, null, 2));

        throw new Error(
          'Could not load Firebase Admin credentials. Please ensure FIREBASE_SERVICE_ACCOUNT_KEY or ' +
          'FIREBASE_CLIENT_EMAIL/PRIVATE_KEY environment variables are set correctly in your production environment.'
        );
      }
    }
  } catch (initError: any) {
    // Handle the case where another process/hot-reload initialized it just now
    if (initError.code === 'app/duplicate-app') {
      return admin.app();
    }
    
    console.error('Firebase Admin: Critical initialization error:', initError);
    throw initError;
  }
}

// Lazy initialization state
let _app: admin.app.App;

function getCachedApp() {
  if (!_app) _app = getAdminApp();
  return _app;
}

/**
 * Creates a proxy that delays initialization until a property is accessed
 */
function createLazyProxy<T extends object>(initFn: () => T): T {
  let instance: T;
  return new Proxy({} as T, {
    get(target, prop, receiver) {
      if (!instance) instance = initFn();
      const val = Reflect.get(instance, prop, receiver);
      return typeof val === 'function' ? val.bind(instance) : val;
    }
  });
}

// Export lazy versions of the admin services
export const adminDb = createLazyProxy(() => admin.firestore(getCachedApp()));
export const adminAuth = createLazyProxy(() => admin.auth(getCachedApp()));
export const adminStorage = createLazyProxy(() => admin.storage(getCachedApp()));

// Default export is the lazy app
export default createLazyProxy(() => getCachedApp());
