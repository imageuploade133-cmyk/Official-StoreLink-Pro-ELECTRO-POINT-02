import { NextResponse } from 'next/server';
import { adminDb, adminAuth } from '@/lib/firebase-admin';
import * as bcrypt from 'bcryptjs';

export async function POST(request: Request) {
  try {
    const { email, password, storeId } = await request.json();

    if (!email || !password || !storeId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const authId = `${storeId}_${email.toLowerCase()}`;
    const authRef = adminDb.collection('customerAuth').doc(authId);
    let authDoc = await authRef.get();

    if (!authDoc.exists) {
      // Fallback: Check if user exists in standard Firebase Auth (for existing customers)
      try {
        const userRecord = await adminAuth.getUserByEmail(email.toLowerCase());

        // If user exists in standard Auth, we check if they are a customer in this store
        // For simplicity, if they exist in standard Auth, we'll allow them to migrate
        // by creating a record in customerAuth if they provide the correct password.
        // But since we can't verify the standard Auth password here, we'll just return 401
        // and expect them to sign up or use the old method if we supported it.
        // BETTER: Try to sign in with Firebase Auth and if successful, migrate them.
        // However, we don't have the standard login API anymore in the frontend.

        // Actually, the simplest way is to tell them to sign up again for this specific store
        // or just return 401 as before but maybe with a better message.
        return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
      } catch (e) {
        return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
      }
    }

    const userData = authDoc.data();
    const isPasswordValid = bcrypt.compareSync(password, userData?.password);

    if (!isPasswordValid) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
    }

    // Create a custom token for the user
    const customToken = await adminAuth.createCustomToken(authId, {
        storeId,
        email: email.toLowerCase(),
        role: 'customer'
    });

    return NextResponse.json({ customToken, uid: authId });
  } catch (error: any) {
    console.error('Login API Error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
