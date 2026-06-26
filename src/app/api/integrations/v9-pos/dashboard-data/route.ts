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
    let config = null;
    try {
      const configSnap = await adminDb.collection('sync_settings').doc('global').get();
      config = configSnap.exists ? configSnap.data() : null;
    } catch (configError) {
      console.error('[V9 Sync Dashboard] Error fetching config:', configError);
      // Return a partial response since config might not exist yet
    }

    // Fetch product sync map count
    let mappingCount = 0;
    try {
        const mappingCountSnap = await adminDb.collection('product_sync_map').count().get();
        mappingCount = mappingCountSnap.data().count;
    } catch (countError) {
        console.warn('[V9 Sync Dashboard] count() query failed, falling back:', countError);
        mappingCount = 0;
    }

    // Fetch recent integration events
    let events: any[] = [];
    try {
        const eventsSnap = await adminDb.collection('integration_events')
          .orderBy('created_at', 'desc')
          .limit(20)
          .get();
        
        events = eventsSnap.docs.map(doc => {
            const data = doc.data();
            let createdAt = null;
            if (data.created_at) {
                if (typeof data.created_at.toDate === 'function') {
                    createdAt = data.created_at.toDate().toISOString();
                } else if (data.created_at._seconds) {
                    createdAt = new Date(data.created_at._seconds * 1000).toISOString();
                } else {
                    createdAt = data.created_at;
                }
            }
            return {
                id: doc.id,
                ...data,
                created_at: createdAt
            };
        });
    } catch (eventsError) {
        console.error('[V9 Sync Dashboard] Error fetching events:', eventsError);
        events = [];
    }

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
