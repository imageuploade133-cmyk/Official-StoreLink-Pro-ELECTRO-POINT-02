import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { adminDb } from '@/lib/firebase-admin';

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const body = JSON.parse(rawBody);

    const clientId = req.headers.get('x-v9-client-id');
    const eventId = req.headers.get('x-v9-event-id');
    const timestamp = req.headers.get('x-v9-timestamp');
    const signature = req.headers.get('x-v9-signature');

    if (!clientId || !eventId || !timestamp || !signature) {
      return NextResponse.json({ success: false, message: 'Missing security headers' }, { status: 401 });
    }

    const now = Math.floor(Date.now() / 1000);
    const requestTime = parseInt(timestamp);
    if (Math.abs(now - requestTime) > 300) {
      return NextResponse.json({ success: false, message: 'Stale request' }, { status: 401 });
    }

    const configDoc = await adminDb.collection('sync_settings').doc(clientId).get();
    let config = configDoc.exists ? configDoc.data() : null;
    
    if (!config) {
      const globalConfig = await adminDb.collection('sync_settings').doc('global').get();
      if (globalConfig.exists) config = globalConfig.data();
    }

    if (!config || !config.sharedSecret) {
      return NextResponse.json({ success: false, message: 'Client not authorized' }, { status: 401 });
    }

    const signaturePayload = rawBody + timestamp;
    const expectedSignature = crypto
      .createHmac('sha256', config.sharedSecret)
      .update(signaturePayload)
      .digest('hex');

    if (signature !== expectedSignature) {
      return NextResponse.json({ success: false, message: 'Invalid signature' }, { status: 401 });
    }

    const eventRef = adminDb.collection('integration_events').doc(eventId);
    const existingEvent = await eventRef.get();
    if (existingEvent.exists) {
      return NextResponse.json({ success: true, message: 'Event already received', eventId }, { status: 200 });
    }

    await eventRef.set({
      source: 'v9_pos',
      event_id: eventId,
      event_type: body.event_type,
      store_id: body.store_id || 'unknown',
      external_product_id: body.product?.id || body.products?.[0]?.id || null,
      payload: body,
      status: 'pending',
      retry_count: 0,
      created_at: new Date(),
    });

    return NextResponse.json({ 
      success: true, 
      message: 'Event received and queued', 
      eventId 
    }, { status: 202 });

  } catch (error) {
    return NextResponse.json({ success: false, message: String(error) }, { status: 500 });
  }
}
