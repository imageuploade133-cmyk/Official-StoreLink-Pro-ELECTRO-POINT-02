import * as admin from 'firebase-admin';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables from .env file
dotenv.config();

/**
 * Migration Script: Update existing documents for Multi-Store support.
 * 
 * Requirements:
 * 1. For each existing user:
 *    - Create a store document in /stores
 *    - Set owner_id = user UID
 * 2. For all collections (products, categories, customers, orders, etc.):
 *    - Add store_id = user's storeId
 * 3. Only update documents where store_id is missing
 * 4. Ensure no data is lost
 * 5. Use batch writes or Firebase Admin SDK
 */

async function migrate() {
    console.log('--- Starting Multi-Store Migration ---');

    // Initialize Firebase Admin
    if (!admin.apps.length) {
        const projectId = process.env.FIREBASE_PROJECT_ID || 'valentino-ice-cream';
        console.log(`Initializing Firebase Admin for project: ${projectId}`);
        
        try {
            const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
            let key: any;

            if (serviceAccountKey) {
                try {
                    // Handle potential quoting issues and whitespace
                    const cleanedKey = serviceAccountKey.trim().replace(/^['"](.*)['"]$/, '$1');
                    key = cleanedKey.startsWith('{') 
                        ? JSON.parse(cleanedKey) 
                        : JSON.parse(Buffer.from(cleanedKey, 'base64').toString());
                } catch (e) {
                    console.error('Failed to parse FIREBASE_SERVICE_ACCOUNT_KEY env var');
                }
            }

            // Fallback to serviceAccountKey.json file if env var failed or was missing
            if (!key) {
                const filePath = path.join(process.cwd(), 'serviceAccountKey.json');
                const fs = require('fs');
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
                    projectId: projectId
                });
                console.log('Firebase Admin initialized with service account credentials');
            } else {
                // Fallback to default credentials or just project ID (for local emulator or authorized environments)
                admin.initializeApp({
                    projectId: projectId
                });
                console.log('Firebase Admin initialized with default credentials');
            }
        } catch (error) {
            console.error('Firebase admin initialization error:', error);
            // Still try to continue if it might work (e.g. already initialized)
        }
    }

    const db = admin.firestore();
    const userStoreMap = new Map<string, string>();

    // 1. Get all existing users
    console.log('Fetching users...');
    const usersSnap = await db.collection('users').get();
    console.log(`Found ${usersSnap.size} users.`);

    // 2. Create stores for each user
    for (const userDoc of usersSnap.docs) {
        const userId = userDoc.id;
        const userData = userDoc.data();
        
        // Check if store already exists for this owner
        const existingStoreSnap = await db.collection('stores')
            .where('owner_id', '==', userId)
            .limit(1)
            .get();

        let storeId;
        if (existingStoreSnap.empty) {
            // Requirement 1: Create a store document in /stores
            // We use the userId as the document ID for the store to ensure 1-to-1 mapping and easy identification
            storeId = userId; 
            await db.collection('stores').doc(storeId).set({
                id: storeId,
                owner_id: userId,
                name: userData.displayName || userData.name || `Store of ${userData.email || userId}`,
                createdAt: admin.firestore.FieldValue.serverTimestamp()
            });
            console.log(`Created store "${storeId}" for owner "${userId}"`);
        } else {
            storeId = existingStoreSnap.docs[0].id;
            console.log(`User "${userId}" already has store "${storeId}"`);
        }
        userStoreMap.set(userId, storeId);
    }

    // Determine the "Default/Primary" store for orphaned global data.
    // We'll look for the first staff member with 'admin' role.
    let defaultStoreId: string | null = null;
    const staffSnap = await db.collection('staff').where('role', '==', 'admin').limit(1).get();
    
    if (!staffSnap.empty) {
        const adminUid = staffSnap.docs[0].data().uid;
        defaultStoreId = userStoreMap.get(adminUid) || adminUid; // Fallback to UID if store doc wasn't created yet
    }
    
    if (!defaultStoreId && userStoreMap.size > 0) {
        // Fallback to the first user found
        defaultStoreId = Array.from(userStoreMap.values())[0];
    }

    if (!defaultStoreId) {
        console.warn('Warning: No default store ID could be determined. Global documents without owner references may not be updated.');
    } else {
        console.log(`Default store ID for global documents: ${defaultStoreId}`);
    }

    // List of collections to migrate
    const collectionsToMigrate = [
        'products',
        'categories',
        'customers',
        'orders',
        'saleTransactions',
        'restockEntries',
        'staff',
        'heldSales',
        'creditPayments',
        'expenses',
        'reversals',
        'stockAudit',
        'adLinks',
        'coupons',
        'flash_sales',
        'invoices',
        'stockAuditEntries',
        'websiteTraffic',
        'homepageSections',
        'slideShows',
        'publicPages',
        'whatsappMessageLogs',
        'payment_providers',
        'branches',
        'customerHistory',
        'stockTransfers'
    ];

    // 3. Update documents in each collection
    for (const collectionName of collectionsToMigrate) {
        console.log(`Processing collection: ${collectionName}...`);
        const colRef = db.collection(collectionName);
        const snapshot = await colRef.get();
        
        let updateCount = 0;
        let batch = db.batch();
        let batchCount = 0;

        for (const doc of snapshot.docs) {
            const data = doc.data();
            
            // Requirement 3: Only update documents where store_id is missing
            if (!data.store_id && !data.storeId) {
                let targetStoreId = defaultStoreId;

                // Attempt to find a more specific storeId based on user references in the document
                const possibleUserIds = [
                    data.user_id, 
                    data.userId, 
                    data.uid, 
                    data.staffId, 
                    data.recordedBy, 
                    data.reversedBy,
                    data.customerId
                ];

                for (const uid of possibleUserIds) {
                    if (uid && typeof uid === 'string' && userStoreMap.has(uid)) {
                        targetStoreId = userStoreMap.get(uid)!;
                        break;
                    }
                }

                if (targetStoreId) {
                    // Requirement 2 & 5: Add store_id and use batch writes
                    batch.update(doc.ref, { store_id: targetStoreId });
                    updateCount++;
                    batchCount++;
                    
                    // Firestore batches are limited to 500 operations
                    if (batchCount === 500) {
                        await batch.commit();
                        console.log(`Committed batch of 500 for ${collectionName}`);
                        batch = db.batch();
                        batchCount = 0;
                    }
                }
            }
        }

        if (batchCount > 0) {
            await batch.commit();
        }
        console.log(`Finished ${collectionName}: Updated ${updateCount} documents.`);
    }

    // Special case for settings (usually a small number of docs)
    console.log('Updating settings...');
    const settingsSnap = await db.collection('settings').get();
    for (const doc of settingsSnap.docs) {
        if (!doc.data().store_id) {
            await doc.ref.update({ store_id: defaultStoreId });
        }
    }

    console.log('--- Migration Completed Successfully ---');
}

migrate().catch(err => {
    console.error('Migration failed:', err);
    process.exit(1);
});
