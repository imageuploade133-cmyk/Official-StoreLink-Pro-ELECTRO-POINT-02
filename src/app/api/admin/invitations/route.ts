import { NextResponse } from 'next/server';
import { adminDb, adminAuth } from '@/lib/firebase-admin';
import { hashInvitationCode, generateInvitationCode } from '@/lib/invitations';

const AUTHORIZED_EMAIL = 'abdulkadir123shaba@gmail.com';

async function verifySuperAdmin(request: Request) {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
        console.warn('verifySuperAdmin: Missing or invalid Authorization header');
        return false;
    }

    try {
        const token = authHeader.split('Bearer ')[1];
        // If adminAuth is not properly initialized, this will throw a configuration error
        const decodedToken = await adminAuth.verifyIdToken(token!);

        const userEmail = decodedToken.email?.toLowerCase();
        const authorizedEmail = AUTHORIZED_EMAIL.toLowerCase();

        const isAuthorized = userEmail === authorizedEmail;

        if (!isAuthorized) {
            console.warn(`verifySuperAdmin: Email mismatch. Expected ${authorizedEmail}, got ${userEmail}`);
        }

        return isAuthorized;
    } catch (e: any) {
        console.error('verifySuperAdmin: Error:', e.message);
        // If it's a configuration error from our firebase-admin.ts, rethrow it to trigger a 500
        if (e.message.includes('Could not load Firebase Admin credentials')) {
            throw e;
        }
        // Otherwise, it's a token verification failure (e.g., expired, malformed), so return false (403)
        return false;
    }
}

export async function POST(request: Request) {
  try {
    if (!await verifySuperAdmin(request)) {
        console.warn('Unauthorized attempt to generate invitation');
        return NextResponse.json({ error: 'Unauthorized: Super Admin access required' }, { status: 403 });
    }

    let body;
    try {
      body = await request.json();
    } catch (e) {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const { createdBy, expiresAt, maxUses = 1, plan = 'free', planDurationDays = 30 } = body;

    if (!createdBy) {
      return NextResponse.json({ error: 'Creator name/email is required' }, { status: 400 });
    }

    console.log(`Generating invitation: createdBy=${createdBy}, plan=${plan}, maxUses=${maxUses}`);

    const plainCode = generateInvitationCode();
    const codeHash = hashInvitationCode(plainCode);

    const invitationData = {
      codeHash,
      createdAt: new Date().toISOString(),
      createdBy,
      expiresAt: expiresAt || null,
      status: 'unused',
      usedCount: 0,
      maxUses,
      plan,
      planDurationDays,
      history: []
    };

    const docRef = await adminDb.collection('invitations').add(invitationData);

    return NextResponse.json({
        id: docRef.id,
        code: plainCode
    });
  } catch (error: any) {
    console.error('Error generating invitation:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function GET(request: Request) {
    try {
        if (!await verifySuperAdmin(request)) {
            return NextResponse.json({ error: 'Unauthorized: Super Admin access required' }, { status: 403 });
        }
        const snapshot = await adminDb.collection('invitations').orderBy('createdAt', 'desc').get();
        const invitations = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        return NextResponse.json(invitations);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function PATCH(request: Request) {
  try {
    if (!await verifySuperAdmin(request)) {
        return NextResponse.json({ error: 'Unauthorized: Super Admin access required' }, { status: 403 });
    }
    const { id, status } = await request.json();

    if (!id || !status) {
      return NextResponse.json({ error: 'ID and status are required' }, { status: 400 });
    }

    await adminDb.collection('invitations').doc(id).update({
      status,
      updatedAt: new Date().toISOString(),
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error updating invitation:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
