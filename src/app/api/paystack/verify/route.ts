import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { Timestamp } from 'firebase-admin/firestore';
import { Transaction } from '@/lib/types';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const reference = searchParams.get('reference');

    if (!reference) {
      return NextResponse.json({ error: 'Reference is required' }, { status: 400 });
    }

    const secretKey = process.env.PAYSTACK_SECRET_KEY;
    if (!secretKey) {
      return NextResponse.json({ error: 'Paystack secret key not configured' }, { status: 500 });
    }

    const response = await fetch(`https://api.paystack.co/transaction/verify/${reference}`, {
      headers: {
        Authorization: `Bearer ${secretKey}`,
      },
    });

    const result = await response.json();

    if (result.status && result.data.status === 'success') {
      const data = result.data;
      const orderId = data.metadata?.orderId;
      
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
            // Create transaction record if it doesn't exist
            const newTransaction: Partial<Transaction> = {
                id: reference,
                storeId: 'global',
                orderId,
                provider: 'paystack',
                reference,
                amount: data.amount / 100,
                currency: data.currency,
                status: 'success',
                customerEmail: data.customer.email,
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

      return NextResponse.json({ success: true, status: 'success', data: result.data });
    }

    return NextResponse.json({ 
      success: false, 
      status: result.data?.status || 'failed', 
      message: result.message 
    });

  } catch (error: any) {
    console.error('Paystack verification error:', error);
    const message = error.message || 'Unknown error';
    if (message.includes('Could not load the default credentials')) {
        return NextResponse.json({ error: 'Missing Google Cloud credentials. Please ensure FIREBASE_SERVICE_ACCOUNT_KEY is set in your environment or serviceAccountKey.json exists. See FIREBASE_ADMIN_SETUP.md for instructions.' }, { status: 500 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
