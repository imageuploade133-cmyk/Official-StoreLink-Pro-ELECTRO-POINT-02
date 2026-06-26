import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { verifyAuth } from '@/lib/auth-admin-utils';
import { FieldValue } from 'firebase-admin/firestore';

export async function POST(req: NextRequest) {
  try {
    const user = await verifyAuth(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { clientId, sharedSecret } = body;

    console.log(`[V9 Sync Config] Updating config by user: ${user.uid}`);

    const batch = adminDb.batch();
    
    const configRef = adminDb.collection('sync_settings').doc('global');
    batch.set(configRef, {
      clientId,
      sharedSecret,
      updatedAt: FieldValue.serverTimestamp()
    }, { merge: true });

    if (clientId) {
      const clientRef = adminDb.collection('sync_settings').doc(clientId);
      batch.set(clientRef, {
        sharedSecret,
        updatedAt: FieldValue.serverTimestamp()
      }, { merge: true });
    }

    await batch.commit();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[V9 Sync Config] Error saving config:', error);
    return NextResponse.json({ 
        error: 'Internal Server Error', 
        details: error instanceof Error ? error.message : String(error) 
    }, { status: 500 });
  }
}
