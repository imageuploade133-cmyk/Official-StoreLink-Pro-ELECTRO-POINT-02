import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { verifyAuth } from '@/lib/auth-admin-utils';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const user = await verifyAuth(req);
    if (!user) {
      console.warn('[V9 Sync Dashboard] Unauthorized access attempt');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log(`[V9 Sync Dashboard] Querying dashboard data for user: ${user.uid}`);

    // Fetch sync config
    const configSnap = await adminDb.collection('sync_settings').doc('global').get();
    const config = configSnap.exists ? configSnap.data() : null;

    // Fetch product sync map count
    // Note: admin SDK doesn't have .count() in some versions, but Firebase Admin 11.0.0+ does.
    // If it fails, we'll fall back to a manual count.
    let mappingCount = 0;
    try {
        const mappingCountSnap = await adminDb.collection('product_sync_map').count().get();
        mappingCount = mappingCountSnap.data().count;
    } catch (countError) {
        console.warn('[V9 Sync Dashboard] count() query failed, falling back to get():', countError);
        const mappingSnap = await adminDb.collection('product_sync_map').select().get();
        mappingCount = mappingSnap.size;
    }

    // Fetch recent integration events
    const eventsSnap = await adminDb.collection('integration_events')
      .orderBy('created_at', 'desc')
      .limit(20)
      .get();
    
    const events = eventsSnap.docs.map(doc => {
        const data = doc.data();
        return {
            id: doc.id,
            ...data,
            created_at: data.created_at ? (data.created_at.toDate ? data.created_at.toDate().toISOString() : data.created_at) : null
        };
    });

    return NextResponse.json({
      config,
      mappingCount,
      events
    });
  } catch (error) {
    console.error('[V9 Sync Dashboard] Error fetching dashboard data:', error);
    return NextResponse.json({ 
        error: 'Internal Server Error', 
        details: error instanceof Error ? error.message : String(error) 
    }, { status: 500 });
  }
}
