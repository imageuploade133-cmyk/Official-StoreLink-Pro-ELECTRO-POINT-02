import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { processSyncEvent } from '@/lib/integrations/v9-pos/processor';
import { verifyAuth } from '@/lib/auth-admin-utils';

export async function POST(req: NextRequest) {
  try {
    const user = await verifyAuth(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const failedEvents = await adminDb.collection('integration_events')
      .where('status', '==', 'failed')
      .orderBy('created_at', 'asc')
      .limit(50)
      .get();

    if (failedEvents.empty) {
      return NextResponse.json({ success: true, message: 'No failed events to retry' });
    }

    let processedCount = 0;
    let failedCount = 0;

    for (const doc of failedEvents.docs) {
      try {
        await processSyncEvent(doc.id);
        processedCount++;
      } catch (err) {
        failedCount++;
      }
    }

    return NextResponse.json({ 
      success: true, 
      processedCount, 
      failedCount,
      totalFound: failedEvents.size
    });

  } catch (error) {
    console.error('[Retry Failed Error]', error);
    return NextResponse.json({ success: false, message: String(error) }, { status: 500 });
  }
}
