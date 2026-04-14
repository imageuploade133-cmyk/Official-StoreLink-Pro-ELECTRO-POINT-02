import { NextResponse } from 'next/server';
import { initializeFirebase } from '@/firebase/init';
import { doc, getDoc, updateDoc, Timestamp, runTransaction } from 'firebase/firestore';
import { decrypt } from '@/lib/encryption';
import { PaymentProvider, Transaction } from '@/lib/types';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const reference = searchParams.get('reference') || searchParams.get('transaction_id'); // FLW uses transaction_id
    const providerName = searchParams.get('provider');
    const storeId = searchParams.get('storeId') || 'global';

    if (!reference || !providerName) {
      return NextResponse.json({ error: 'Missing reference or provider' }, { status: 400 });
    }

    const { firestore } = initializeFirebase();
    
    // Check if transaction already processed
    const transactionRef = doc(firestore, 'transactions', reference);
    const transactionSnap = await getDoc(transactionRef);
    
    if (!transactionSnap.exists()) {
        // For Flutterwave, the reference might be different in the callback
        // In a real app, we should search by tx_ref
        return NextResponse.json({ error: 'Transaction not found' }, { status: 404 });
    }
    
    const transactionData = transactionSnap.data() as Transaction;
    if (transactionData.status === 'success') {
        return NextResponse.json({ success: true, status: 'success' });
    }

    const providerId = `${storeId}_${providerName}`;
    const providerSnap = await getDoc(doc(firestore, 'payment_providers', providerId));
    if (!providerSnap.exists()) {
      throw new Error('Provider not configured');
    }

    const config = JSON.parse(decrypt(providerSnap.data().config));
    const mode = providerSnap.data().mode || 'test';
    const secretKey = mode === 'live' ? config.liveSecretKey : config.testSecretKey || config.secretKey;
    
    let isSuccessful = false;

    if (providerName === 'paystack') {
      const res = await fetch(`https://api.paystack.co/transaction/verify/${reference}`, {
        headers: { Authorization: `Bearer ${secretKey}` },
      });
      const result = await res.json();
      isSuccessful = result.status && result.data.status === 'success';
    } else if (providerName === 'flutterwave') {
      // For Flutterwave, reference here might be the transaction ID
      const res = await fetch(`https://api.flutterwave.com/v3/transactions/${reference}/verify`, {
        headers: { Authorization: `Bearer ${secretKey}` },
      });
      const result = await res.json();
      isSuccessful = result.status === 'success' && result.data.status === 'successful';
    }

    if (isSuccessful) {
      await runTransaction(firestore, async (dbTransaction) => {
        const tSnap = await dbTransaction.get(transactionRef);
        if (!tSnap.exists()) return;
        const tData = tSnap.data() as Transaction;
        if (tData.status === 'success') return;

        dbTransaction.update(transactionRef, {
          status: 'success',
          updatedAt: Timestamp.now(),
        });

        // Update Order Status
        const orderRef = doc(firestore, 'orders', tData.orderId);
        dbTransaction.update(orderRef, {
          status: 'processing',
          isPaid: true,
          updatedAt: Timestamp.now(),
        });
      });

      return NextResponse.json({ success: true, status: 'success' });
    } else {
      await updateDoc(transactionRef, {
        status: 'failed',
        updatedAt: Timestamp.now(),
      });
      return NextResponse.json({ success: false, status: 'failed' });
    }

  } catch (error: any) {
    console.error('Error verifying payment:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
