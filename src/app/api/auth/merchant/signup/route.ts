import { NextResponse } from 'next/server';
import { adminDb, adminAuth } from '@/lib/firebase-admin';
import { hashInvitationCode } from '@/lib/invitations';

export async function POST(request: Request) {
  try {
    const {
        email,
        password,
        name,
        storeName,
        storeSlug,
        storeAddress,
        storePhone,
        databaseId,
        invitationCode
    } = await request.json();

    if (!email || !password || !invitationCode || !storeSlug) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const codeHash = hashInvitationCode(invitationCode);

    // We must use a transaction to ensure atomic check and update of the invitation
    const result = await adminDb.runTransaction(async (transaction) => {
        // 1. Validate Invitation
        const invitationQuery = adminDb.collection('invitations').where('codeHash', '==', codeHash).limit(1);
        const invitationSnapshot = await transaction.get(invitationQuery);

        if (invitationSnapshot.empty) {
            throw new Error('Invalid or Expired Invitation Code.');
        }

        const invitationDoc = invitationSnapshot.docs[0];
        const invitation = invitationDoc.data();

        if (invitation.status === 'revoked' || invitation.status === 'expired') {
            throw new Error('Invalid or Expired Invitation Code.');
        }

        if (invitation.expiresAt && new Date(invitation.expiresAt) < new Date()) {
            transaction.update(invitationDoc.ref, { status: 'expired' });
            throw new Error('Invalid or Expired Invitation Code.');
        }

        if (invitation.usedCount >= invitation.maxUses) {
            throw new Error('Invalid or Expired Invitation Code.');
        }

        // 2. Check if store slug is available
        const storeDoc = await transaction.get(adminDb.collection('stores').doc(storeSlug));
        if (storeDoc.exists) {
            throw new Error('Store URL already taken.');
        }

        // 3. Create User in Firebase Auth
        let userRecord;
        try {
            userRecord = await adminAuth.createUser({
                email,
                password,
                displayName: name,
            });
        } catch (authError: any) {
            if (authError.code === 'auth/email-already-in-use') {
                throw new Error('Email already in use.');
            }
            throw authError;
        }

        const uid = userRecord.uid;

        // 4. Update Invitation
        const newUsedCount = invitation.usedCount + 1;
        transaction.update(invitationDoc.ref, {
            status: newUsedCount >= invitation.maxUses ? 'used' : 'unused',
            usedBy: uid,
            usedAt: new Date().toISOString(),
            usedCount: newUsedCount,
            history: [...(invitation.history || []), {
                action: 'used',
                userId: uid,
                timestamp: new Date().toISOString()
            }]
        });

        // 5. Setup Store Data
        const storeRef = adminDb.collection('stores').doc(storeSlug);
        const plan = invitation.plan || 'free';
        const planDurationDays = invitation.planDurationDays || 30;
        const planExpiresAt = new Date();
        planExpiresAt.setDate(planExpiresAt.getDate() + planDurationDays);

        transaction.set(storeRef, {
            id: storeSlug,
            slug: storeSlug,
            owner_id: uid,
            name: storeName,
            address: storeAddress,
            phone: storePhone,
            databaseId: databaseId || '(default)',
            plan,
            planExpiresAt: planExpiresAt.toISOString(),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        });

        transaction.set(adminDb.collection('users').doc(uid), {
            uid: uid,
            email: email,
            displayName: name,
            updatedAt: new Date().toISOString(),
        });

        const staffId = `${uid}_${storeSlug}`;
        transaction.set(adminDb.collection('staff').doc(staffId), {
            id: staffId,
            uid: uid,
            store_id: storeSlug,
            name: name,
            email: email,
            role: 'admin',
            status: 'Active',
            permissions: {
                pages: ['view_dashboard', 'view_inventory', 'add_products', 'edit_products', 'delete_products', 'view_categories', 'add_categories', 'edit_categories', 'delete_categories', 'view_staff', 'manage_staff', 'view_permissions', 'view_settings', 'manage_settings', 'manage_coupons', 'manage_website_content', 'canViewCustomers', 'canAddCustomers', 'canEditCustomers', 'canDeleteCustomers', 'canPrintBarcodes', 'view_stock_alerts', 'transfer_stock', 'canBulkRestock', 'canAccessPOS', 'view_my_sales', 'view_sales_history', 'canViewProductSales', 'canManageExpenses', 'canBulkAddProducts', 'canProcessReturns', 'canSendMarketingWhatsapp', 'manage_orders', 'view_online_customers', 'manage_flexible_payments', 'view_stock_audit', 'manage_ads']
            },
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        });

        const settingsData = {
            store_id: storeSlug,
            storeName: storeName,
            storeAddress: storeAddress,
            storePhone: storePhone,
            storeEmail: email,
            currency: '₦',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        };

        transaction.set(adminDb.collection('settings').doc(storeSlug), settingsData);
        transaction.set(adminDb.collection('stores').doc(storeSlug).collection('settings').doc('config'), settingsData);

        return { uid, storeSlug };
    });

    return NextResponse.json({ success: true, ...result });
  } catch (error: any) {
    console.error('Merchant Signup API Error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
