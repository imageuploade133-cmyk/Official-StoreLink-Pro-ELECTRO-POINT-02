import { NextResponse } from 'next/server';
import { adminDb, adminAuth } from '@/lib/firebase-admin';
import * as bcrypt from 'bcryptjs';

export async function POST(request: Request) {
  try {
    const { email, password, name, storeId, ...otherDetails } = await request.json();

    if (!email || !password || !storeId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const authId = `${storeId}_${email.toLowerCase()}`;
    const authRef = adminDb.collection('customerAuth').doc(authId);
    const authDoc = await authRef.get();

    if (authDoc.exists) {
      return NextResponse.json({ error: 'Email already registered in this store' }, { status: 400 });
    }

    const hashedPassword = bcrypt.hashSync(password, 10);

    // Create the auth record
    await authRef.set({
      email: email.toLowerCase(),
      password: hashedPassword,
      storeId,
      createdAt: new Date().toISOString(),
    });

    // Create a custom token for the user
    // We'll use the authId as the UID to keep it unique across stores
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
