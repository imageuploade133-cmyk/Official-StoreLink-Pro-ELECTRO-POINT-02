import * as admin from 'firebase-admin';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

// Load environment variables from .env file
dotenv.config();

/**
 * Migration Script: Update existing documents for Multi-Store support.
 */

async function migrate() {
    console.log('--- Starting Multi-Store Migration ---');

    // Initialize Firebase Admin
    if (!admin.apps.length) {
        const projectId = process.env.FIREBASE_PROJECT_ID || 'valentino-ice-cream';
        const serviceAccountKeyEnv = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
        
        let serviceAccount: any = null;

        // 1. Try environment variable
        if (serviceAccountKeyEnv) {
            const cleaned = serviceAccountKeyEnv.trim();
            if (cleaned.startsWith('{') || cleaned.replace(/^['"](.*)['"]$/, '$1').startsWith('{')) {
                try {
                    serviceAccount = JSON.parse(cleaned.replace(/^['"](.*)['"]$/, '$1'));
                } catch (e) {
                    console.error('Failed to parse service account JSON from env');
                }
            } else {
                try {
                    const decoded = Buffer.from(cleaned, 'base64').toString('utf8');
                    if (decoded.startsWith('{')) {
                        serviceAccount = JSON.parse(decoded);
                    }
                } catch (e) {}
            }
        }

        // 2. Try local file
        if (!serviceAccount) {
            const filePath = path.join(process.cwd(), 'serviceAccountKey.json');
            if (fs.existsSync(filePath)) {
                try {
                    serviceAccount = JSON.parse(fs.readFileSync(filePath, 'utf8'));
                } catch (e) {
                    console.error('Failed to read serviceAccountKey.json');
                }
            }
        }

        try {
            if (serviceAccount) {
                if (serviceAccount.private_key && typeof serviceAccount.private_key === 'string') {
                    serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
                }
                admin.initializeApp({
                    credential: admin.credential.cert(serviceAccount),
                    projectId: projectId
                });
                console.log('Firebase Admin initialized with service account key.');
            } else {
                admin.initializeApp({ projectId });
                console.log('Firebase Admin initialized with default credentials.');
            }
        } catch (error) {
            console.error('Firebase admin initialization error:', error);
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
    let defaultStoreId: string | null = null;
    const staffSnap = await db.collection('staff').where('role', '==', 'admin').limit(1).get();
    
    if (!staffSnap.empty) {
        const adminUid = staffSnap.docs[0].data().uid;
        defaultStoreId = userStoreMap.get(adminUid) || adminUid;
    }
    
    if (!defaultStoreId && userStoreMap.size > 0) {
        defaultStoreId = Array.from(userStoreMap.values())[0];
    }

    if (!defaultStoreId) {
        console.warn('Warning: No default store ID could be determined.');
    } else {
        console.log(`Default store ID: ${defaultStoreId}`);
    }

    // List of collections to migrate
    const collectionsToMigrate = [
        'products', 'categories', 'customers', 'orders', 'saleTransactions',
        'restockEntries', 'staff', 'heldSales', 'creditPayments', 'expenses',
        'reversals', 'stockAudit', 'adLinks', 'coupons', 'flash_sales',
        'invoices', 'stockAuditEntries', 'websiteTraffic', 'homepageSections',
        'slideShows', 'publicPages', 'whatsappMessageLogs', 'payment_providers',
        'branches', 'customerHistory', 'stockTransfers'
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
            
            if (!data.store_id && !data.storeId) {
                let targetStoreId = defaultStoreId;

                const possibleUserIds = [
                    data.user_id, data.userId, data.uid, data.staffId, 
                    data.recordedBy, data.reversedBy, data.customerId
                ];

                for (const uid of possibleUserIds) {
                    if (uid && typeof uid === 'string' && userStoreMap.has(uid)) {
                        targetStoreId = userStoreMap.get(uid)!;
                        break;
                    }
                }

                if (targetStoreId) {
                    batch.update(doc.ref, { store_id: targetStoreId });
                    updateCount++;
                    batchCount++;
                    
                    if (batchCount === 500) {
                        await batch.commit();
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

    // Special case for settings
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
