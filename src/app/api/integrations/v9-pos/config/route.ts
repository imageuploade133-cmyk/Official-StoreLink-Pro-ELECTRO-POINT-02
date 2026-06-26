import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { verifyAuth } from '@/lib/auth-admin-utils';
import admin from 'firebase-admin';

export async function POST(req: NextRequest) {
  try {
    const user = await verifyAuth(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    if (!body) {
      return NextResponse.json({ error: 'Missing request body' }, { status: 400 });
    }

    const { clientId, sharedSecret } = body;

    console.log(`[V9 Sync Config] Updating config by user: ${user.uid}`);

    try {
        const batch = adminDb.batch();
        
        const configRef = adminDb.collection('sync_settings').doc('global');
        batch.set(configRef, {
          clientId: clientId || '',
          sharedSecret: sharedSecret || '',
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        }, { merge: true });
    
        if (clientId && clientId !== 'global') {
          const clientRef = adminDb.collection('sync_settings').doc(clientId);
          batch.set(clientRef, {
            sharedSecret: sharedSecret || '',
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
          }, { merge: true });
        }
    
        await batch.commit();
        return NextResponse.json({ success: true });
    } catch (dbError: any) {
        console.error('[V9 Sync Config] Database error:', dbError);
        return NextResponse.json({ 
            error: 'Database Error', 
            details: dbError.message || String(dbError) 
        }, { status: 500 });
    }
  } catch (error) {
    console.error('[V9 Sync Config] Error saving config:', error);
    return NextResponse.json({ 
        error: 'Internal Server Error', 
        details: error instanceof Error ? error.message : String(error) 
    }, { status: 500 });
  }
}
