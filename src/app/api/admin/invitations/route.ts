import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { hashInvitationCode, generateInvitationCode } from '@/lib/invitations';

export async function POST(request: Request) {
  try {
    const { createdBy, expiresAt, maxUses = 1 } = await request.json();

    if (!createdBy) {
      return NextResponse.json({ error: 'CreatedBy is required' }, { status: 400 });
    }

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
        const snapshot = await adminDb.collection('invitations').orderBy('createdAt', 'desc').get();
        const invitations = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        return NextResponse.json(invitations);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function PATCH(request: Request) {
  try {
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
