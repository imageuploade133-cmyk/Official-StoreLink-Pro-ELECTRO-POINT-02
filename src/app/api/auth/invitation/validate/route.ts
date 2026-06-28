import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { hashInvitationCode } from '@/lib/invitations';

export async function POST(request: Request) {
  try {
    // Add artificial delay to mitigate brute-force guessing
    await new Promise(resolve => setTimeout(resolve, 1000));

    const { code } = await request.json();

    if (!code) {
      return NextResponse.json({ error: 'Code is required' }, { status: 400 });
    }

    const codeHash = hashInvitationCode(code);
    const invitationsRef = adminDb.collection('invitations');
    const snapshot = await invitationsRef.where('codeHash', '==', codeHash).limit(1).get();

    if (snapshot.empty) {
      return NextResponse.json({ valid: false, error: 'Invalid or Expired Invitation Code.' });
    }

    const invitationDoc = snapshot.docs[0];
    const invitation = invitationDoc.data();

    // Validate status
    if (invitation.status === 'revoked' || invitation.status === 'expired' || (invitation.status === 'used' && invitation.usedCount >= invitation.maxUses)) {
        return NextResponse.json({ valid: false, error: 'Invalid or Expired Invitation Code.' });
    }

    // Validate expiration
    if (invitation.expiresAt && new Date(invitation.expiresAt) < new Date()) {
        // Optionally update status to expired
        await invitationDoc.ref.update({ status: 'expired' });
        return NextResponse.json({ valid: false, error: 'Invalid or Expired Invitation Code.' });
    }

    // Validate use count
    if (invitation.usedCount >= invitation.maxUses) {
        return NextResponse.json({ valid: false, error: 'Invalid or Expired Invitation Code.' });
    }

    return NextResponse.json({ valid: true });
  } catch (error: any) {
    console.error('Invitation Validation Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
