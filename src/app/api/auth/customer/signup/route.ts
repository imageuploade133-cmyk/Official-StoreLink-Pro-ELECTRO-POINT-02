import { NextResponse } from 'next/server';
import { adminDb, adminAuth } from '@/lib/firebase-admin';
import * as bcrypt from 'bcryptjs';

/**
 * API Route for Customer Signup
 *
 * This route implements store-specific authentication.
 * Instead of using Firebase Auth directly (which enforces unique emails globally),
 * we store customer credentials in a dedicated 'customerAuth' Firestore collection.
 *
 * Each record is uniquely identified by a combination of storeId and email.
 */
export async function POST(request: Request) {
  try {
    const { email, password, name, storeId, ...otherDetails } = await request.json();

    // Basic validation
    if (!email || !password || !storeId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Generate a unique ID for this store-customer pair
    const authId = `${storeId}_${email.toLowerCase()}`;
    const authRef = adminDb.collection('customerAuth').doc(authId);
    const authDoc = await authRef.get();

    if (authDoc.exists) {
      return NextResponse.json({ error: 'Email already registered in this store' }, { status: 400 });
    }

    // Securely hash the password using bcryptjs
    const hashedPassword = bcrypt.hashSync(password, 10);

    // Create the auth record in Firestore
    // This collection should have restricted access via Firestore Rules
    await authRef.set({
      email: email.toLowerCase(),
      password: hashedPassword,
      storeId,
      createdAt: new Date().toISOString(),
    });

    /**
     * Create a Firebase Custom Token
     *
     * We use the composite authId as the UID. This allows the user to be
     * "authenticated" in Firebase Auth while maintaining separate identities
     * for different stores.
     */
    const customToken = await adminAuth.createCustomToken(authId, {
        storeId,
        email: email.toLowerCase(),
        role: 'customer'
    });

    return NextResponse.json({ customToken, uid: authId });
  } catch (error: any) {
    console.error('Signup API Error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
