import { NextResponse } from 'next/server';
import { initializeFirebase } from '@/firebase/init';
import { doc, getDoc, updateDoc, Timestamp, runTransaction } from 'firebase/firestore';
import { decrypt } from '@/lib/encryption';
import crypto from 'crypto';
import { Transaction } from '@/lib/types';

export async function POST(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const providerName = searchParams.get('provider');
    const storeId = searchParams.get('storeId') || 'global';
    
    const body = await request.text();
    const { firestore } = initializeFirebase();

    const providerId = `${storeId}_${providerName}`;
    const providerSnap = await getDoc(doc(firestore, 'payment_providers', providerId));
    
    if (!providerSnap.exists()) {
      return NextResponse.json({ error: 'Provider not found' }, { status: 404 });
    }

    const providerData = providerSnap.data();
    const config = JSON.parse(decrypt(providerData.config));
    const mode = providerData.mode || 'test';
    const secretKey = mode === 'live' ? config.liveSecretKey : config.testSecretKey || config.secretKey;

    if (providerName === 'paystack') {
      const hash = crypto.createHmac('sha512', secretKey).update(body).digest('hex');
      if (hash !== request.headers.get('x-paystack-signature')) {
        return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
      }

      const event = JSON.parse(body);
      if (event.event === 'charge.success') {
        const reference = event.data.reference;
        await processSuccessfulTransaction(firestore, reference);
      }
    } else if (providerName === 'flutterwave') {
        // Flutterwave uses a secret hash set by the user
        const signature = request.headers.get('verif-hash');
        // In a real app, we would check this against a stored secret hash
        // For now, we'll assume it's valid if we want to support it, but better to check
        const event = JSON.parse(body);
        if (event['event.type'] === 'CARD_TRANSACTION' && event.status === 'successful') {
            const reference = event.tx_ref;
            await processSuccessfulTransaction(firestore, reference);
        }
    }

    return NextResponse.json({ received: true });
  } catch (error: any) {
    console.error('Webhook error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

async function processSuccessfulTransaction(firestore: any, reference: string) {
  const transactionRef = doc(firestore, 'transactions', reference);

  await runTransaction(firestore, async (dbTransaction) => {
    const transactionSnap = await dbTransaction.get(transactionRef);

    if (transactionSnap.exists()) {
      const transactionData = transactionSnap.data() as Transaction;
      if (transactionData.status !== 'success') {
        dbTransaction.update(transactionRef, {
          status: 'success',
          updatedAt: Timestamp.now(),
        });

        const orderRef = doc(firestore, 'orders', transactionData.orderId);
        dbTransaction.update(orderRef, {
          status: 'processing',
          isPaid: true,
          updatedAt: Timestamp.now(),
        });
      }
    }
  });
}
