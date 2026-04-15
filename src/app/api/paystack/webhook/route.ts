import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { adminDb } from '@/lib/firebase-admin';
import { Timestamp } from 'firebase-admin/firestore';
import { Transaction } from '@/lib/types';

export async function POST(request: Request) {
  try {
    const body = await request.text();
    const signature = request.headers.get('x-paystack-signature');
    const secretKey = process.env.PAYSTACK_SECRET_KEY;

    if (!secretKey) {
      console.error('Paystack secret key not configured');
      return NextResponse.json({ error: 'Configuration error' }, { status: 500 });
    }

    if (!signature) {
        return NextResponse.json({ error: 'Missing signature' }, { status: 401 });
    }

    const hash = crypto.createHmac('sha512', secretKey).update(body).digest('hex');

    if (hash !== signature) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    const event = JSON.parse(body);

    if (event.event === 'charge.success') {
      const data = event.data;
      const reference = data.reference;
      const orderId = data.metadata?.orderId;
      const amount = data.amount / 100;
      const email = data.customer.email;

      const transactionRef = adminDb.collection('transactions').doc(reference);
      const transactionSnap = await transactionRef.get();

      await adminDb.runTransaction(async (dbTransaction) => {
          if (transactionSnap.exists) {
              const tData = transactionSnap.data() as Transaction;
              if (tData.status !== 'success') {
                  dbTransaction.update(transactionRef, {
                      status: 'success',
                      updatedAt: Timestamp.now(),
                  });

                  if (tData.orderId) {
                      const orderRef = adminDb.collection('orders').doc(tData.orderId);
                      dbTransaction.update(orderRef, {
                          isPaid: true,
                          status: 'paid',
                          updatedAt: Timestamp.now(),
                      });
                  }
              }
          } else if (orderId) {
              const newTransaction: Partial<Transaction> = {
                  id: reference,
                  storeId: 'global',
                  orderId,
                  provider: 'paystack',
                  reference,
                  amount,
                  currency: data.currency,
                  status: 'success',
                  customerEmail: email,
                  createdAt: Timestamp.now() as any,
                  updatedAt: Timestamp.now() as any,
              };
              dbTransaction.set(transactionRef, newTransaction);

              const orderRef = adminDb.collection('orders').doc(orderId);
              dbTransaction.update(orderRef, {
                  isPaid: true,
                  status: 'paid',
                  updatedAt: Timestamp.now(),
              });
          }
      });
    } else if (event.event === 'charge.failed') {
        const data = event.data;
        const orderId = data.metadata?.orderId;
        if (orderId) {
            const orderRef = adminDb.collection('orders').doc(orderId);
            await orderRef.update({
                status: 'failed',
                updatedAt: Timestamp.now(),
            });
        }
    }

    return NextResponse.json({ received: true });
  } catch (error: any) {
    console.error('Paystack webhook error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
