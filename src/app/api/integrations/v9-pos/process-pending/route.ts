import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { processSyncEvent } from '@/lib/integrations/v9-pos/processor';

export async function POST(req: NextRequest) {
  try {
    const pendingEvents = await adminDb.collection('integration_events')
      .where('status', '==', 'pending')
      .orderBy('created_at', 'asc')
      .limit(50)
      .get();

    if (pendingEvents.empty) {
      return NextResponse.json({ success: true, message: 'No pending events' });
    }

    let processedCount = 0;
    let failedCount = 0;

    for (const doc of pendingEvents.docs) {
      try {
        await processSyncEvent(doc.id);
        processedCount++;
      } catch (err) {
        console.error(`Failed to process event ${doc.id}:`, err);
        failedCount++;
      }
    }

    return NextResponse.json({ 
      success: true, 
      processedCount, 
      failedCount,
      totalFound: pendingEvents.size
    });

  } catch (error) {
    console.error('[Process Pending Error]', error);
    return NextResponse.json({ success: false, message: String(error) }, { status: 500 });
  }
}
