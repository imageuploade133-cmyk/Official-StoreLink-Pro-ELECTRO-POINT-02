import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { Timestamp } from 'firebase-admin/firestore';
import { decrypt } from '@/lib/encryption';
import crypto from 'crypto';
import { Transaction } from '@/lib/types';

export async function POST(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const providerName = searchParams.get('provider');
    const storeId = searchParams.get('storeId') || 'global';
    
    const body = await request.text();

    const providerId = `${storeId}_${providerName}`;
    const providerSnap = await adminDb.collection('payment_providers').doc(providerId).get();
    
    if (!providerSnap.exists) {
      return NextResponse.json({ error: 'Provider not found' }, { status: 404 });
    }

    const providerData = providerSnap.data();
    const config = JSON.parse(decrypt(providerData?.config));
    const mode = providerData?.mode || 'test';
    const secretKey = mode === 'live' ? config.liveSecretKey : config.testSecretKey || config.secretKey;

    if (providerName === 'paystack') {
      const hash = crypto.createHmac('sha512', secretKey).update(body).digest('hex');
      if (hash !== request.headers.get('x-paystack-signature')) {
        return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
      }

      const event = JSON.parse(body);
      if (event.event === 'charge.success') {
        const reference = event.data.reference;
        await processSuccessfulTransaction(reference);
      }
    } else if (providerName === 'flutterwave') {
        const event = JSON.parse(body);
        if (event['event.type'] === 'CARD_TRANSACTION' && event.status === 'successful') {
            const reference = event.tx_ref;
            await processSuccessfulTransaction(reference);
        }
    }

    return NextResponse.json({ received: true });
  } catch (error: any) {
    console.error('Webhook error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

async function processSuccessfulTransaction(reference: string) {
  const transactionRef = adminDb.collection('transactions').doc(reference);

  await adminDb.runTransaction(async (dbTransaction) => {
    const transactionSnap = await dbTransaction.get(transactionRef);

    if (transactionSnap.exists) {
      const transactionData = transactionSnap.data() as Transaction;
      if (transactionData.status !== 'success') {
        dbTransaction.update(transactionRef, {
          status: 'success',
          updatedAt: Timestamp.now(),
        });

        const orderRef = adminDb.collection('orders').doc(transactionData.orderId);
        dbTransaction.update(orderRef, {
          status: 'processing',
          isPaid: true,
          updatedAt: Timestamp.now(),
        });
      }
    }
  });
}
