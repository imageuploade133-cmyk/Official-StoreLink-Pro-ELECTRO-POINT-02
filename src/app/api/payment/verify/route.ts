import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { Timestamp } from 'firebase-admin/firestore';
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

    // Check if transaction already processed
    const transactionRef = adminDb.collection('transactions').doc(reference);
    const transactionSnap = await transactionRef.get();
    
    if (!transactionSnap.exists) {
        return NextResponse.json({ error: 'Transaction not found' }, { status: 404 });
    }
    
    const transactionData = transactionSnap.data() as Transaction;
    if (transactionData.status === 'success') {
        return NextResponse.json({ success: true, status: 'success', orderId: transactionData.orderId });
    }

    const providerId = `${storeId}_${providerName}`;
    const providerSnap = await adminDb.collection('payment_providers').doc(providerId).get();
    if (!providerSnap.exists) {
      throw new Error('Provider not configured');
    }

    const config = JSON.parse(decrypt(providerSnap.data()?.config));
    const mode = providerSnap.data()?.mode || 'test';
    const secretKey = mode === 'live' ? config.liveSecretKey : config.testSecretKey || config.secretKey;
    
    let isSuccessful = false;

    if (providerName === 'paystack') {
      const res = await fetch(`https://api.paystack.co/transaction/verify/${reference}`, {
        headers: { Authorization: `Bearer ${secretKey}` },
      });
      const result = await res.json();
      isSuccessful = result.status && result.data.status === 'success';
    } else if (providerName === 'flutterwave') {
      const res = await fetch(`https://api.flutterwave.com/v3/transactions/${reference}/verify`, {
        headers: { Authorization: `Bearer ${secretKey}` },
      });
      const result = await res.json();
      isSuccessful = result.status === 'success' && result.data.status === 'successful';
    } else if (providerName === 'opay') {
      const res = await fetch('https://api.opaycheckout.com/api/v1/international/cashier/status', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${secretKey}`,
          'Content-Type': 'application/json',
          'MerchantId': config.merchantId,
        },
        body: JSON.stringify({ reference }),
      });
      const result = await res.json();
      isSuccessful = result.code === '00000' && result.data.status === 'SUCCESSFUL';
    } else if (providerName === 'palmpay') {
      const res = await fetch(`https://api.palmpay.com/v1/checkout/query?reference=${reference}&merchantId=${config.merchantId}`, {
        headers: { Authorization: `Bearer ${secretKey}` },
      });
      const result = await res.json();
      isSuccessful = (result.code === 'SUCCESS' || result.status === 'success') && 
                     (result.data.status === 'SUCCESSFUL' || result.data.status === 'success');
    }

    if (isSuccessful) {
      await adminDb.runTransaction(async (dbTransaction) => {
        const tSnap = await dbTransaction.get(transactionRef);
        if (!tSnap.exists) return;
        const tData = tSnap.data() as Transaction;
        if (tData.status === 'success') return;

        dbTransaction.update(transactionRef, {
          status: 'success',
          updatedAt: Timestamp.now(),
        });

        // Update Order Status
        const orderRef = adminDb.collection('orders').doc(tData.orderId);
        dbTransaction.update(orderRef, {
          status: 'processing',
          isPaid: true,
          updatedAt: Timestamp.now(),
        });
      });

      return NextResponse.json({ success: true, status: 'success', orderId: transactionData.orderId });
    } else {
      await transactionRef.update({
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
