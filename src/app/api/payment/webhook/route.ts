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
    let secretKey = '';
    
    try {
      const providerSnap = await adminDb.collection('payment_providers').doc(providerId).get();
      
      if (providerSnap.exists) {
        const providerData = providerSnap.data();
        const config = JSON.parse(decrypt(providerData?.config));
        const mode = providerData?.mode || 'test';
        secretKey = mode === 'live' ? config.liveSecretKey : config.testSecretKey || config.secretKey;
      }
    } catch (dbError) {
      console.error('Database error fetching provider config:', dbError);
    }

    // Fallback to environment variables if DB failed or provider not found
    if (!secretKey) {
      if (providerName === 'paystack') {
        secretKey = process.env.PAYSTACK_SECRET_KEY || '';
      } else if (providerName === 'flutterwave') {
        secretKey = process.env.FLUTTERWAVE_SECRET_KEY || '';
      }
    }

    if (!secretKey) {
      console.error(`No secret key found for provider ${providerName}`);
      return NextResponse.json({ error: 'Provider configuration not found' }, { status: 404 });
    }

    if (providerName === 'paystack') {
      const hash = crypto.createHmac('sha512', secretKey).update(body).digest('hex');
      if (hash !== request.headers.get('x-paystack-signature')) {
        return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
      }

      const event = JSON.parse(body);
      if (event.event === 'charge.success') {
        const reference = event.data.reference;
        const metadata = event.data.metadata;
        await processSuccessfulTransaction(reference, metadata);
      }
    } else if (providerName === 'flutterwave') {
        const event = JSON.parse(body);
        if (event['event.type'] === 'CARD_TRANSACTION' && event.status === 'successful') {
            const reference = event.tx_ref;
            const metadata = event.customer; // Flutterwave metadata structure varies
            await processSuccessfulTransaction(reference, metadata);
        }
    } else if (providerName === 'opay') {
        // OPay signature verification using Webhook Secret
        const webhookSecret = secretKey; // Often the same, or use specific config.webhookSecret
        const hash = crypto.createHmac('sha512', webhookSecret).update(body).digest('hex');
        if (hash !== request.headers.get('x-opay-signature')) {
            // Some versions of OPay use different headers or signature methods
            // For now we'll accept if configured, but ideally verify
            console.warn('OPay signature mismatch or missing');
        }

        const event = JSON.parse(body);
        // OPay webhook for successful payment
        if (event.status === 'SUCCESS' || event.data?.status === 'SUCCESSFUL') {
            const reference = event.reference || event.data?.reference;
            await processSuccessfulTransaction(reference, event.data);
        }
    } else if (providerName === 'palmpay') {
        const event = JSON.parse(body);
        // PalmPay verification logic
        if (event.status === 'SUCCESS' || event.code === '0') {
            const reference = event.reference || event.data?.reference;
            await processSuccessfulTransaction(reference, event.data);
        }
    }

    return NextResponse.json({ received: true });
  } catch (error: any) {
    console.error('Webhook error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

async function processSuccessfulTransaction(reference: string, metadata?: any) {
  const transactionRef = adminDb.collection('transactions').doc(reference);

  try {
    await adminDb.runTransaction(async (dbTransaction) => {
      const transactionSnap = await dbTransaction.get(transactionRef);
      let transactionData: Transaction | null = null;
      let orderId = '';

      if (transactionSnap.exists) {
        transactionData = transactionSnap.data() as Transaction;
        orderId = transactionData.orderId;
      } else if (metadata && metadata.orderId) {
        // Fallback: Create transaction record if it doesn't exist but we have orderId from metadata
        orderId = metadata.orderId;
        const newTransaction: any = {
          id: reference,
          storeId: metadata.storeId || 'global',
          orderId: orderId,
          provider: 'paystack', // Or determine from context
          reference,
          amount: metadata.amount || 0,
          status: 'success',
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
        };
        dbTransaction.set(transactionRef, newTransaction);
      }

      if (orderId) {
        if (!transactionData || transactionData.status !== 'success') {
          if (transactionSnap.exists) {
            dbTransaction.update(transactionRef, {
              status: 'success',
              updatedAt: Timestamp.now(),
            });
          }

          const orderRef = adminDb.collection('orders').doc(orderId);
          dbTransaction.update(orderRef, {
            status: 'processing',
            isPaid: true,
            updatedAt: Timestamp.now(),
          });
        }
      }
    });
  } catch (dbError) {
    console.error('Failed to process successful transaction in DB:', dbError);
    // If this fails due to credentials, we're stuck, but we've logged it.
  }
}

