import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { Timestamp } from 'firebase-admin/firestore';
import { decrypt } from '@/lib/encryption';
import { PaymentProvider, Transaction } from '@/lib/types';
import Stripe from 'stripe';

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
    } else if (providerName === 'paypal') {
        const token = searchParams.get('token'); // PayPal Order ID
        if (!token) throw new Error('Missing PayPal token');

        const clientId = mode === 'live' ? config.liveClientId : config.clientId;
        const paypalSecret = mode === 'live' ? config.liveSecretKey : config.secretKey;
        const baseUrl = mode === 'live' ? 'https://api-m.paypal.com' : 'https://api-m.sandbox.paypal.com';

        // Get access token
        const auth = Buffer.from(`${clientId}:${paypalSecret}`).toString('base64');
        const tokenRes = await fetch(`${baseUrl}/v1/oauth2/token`, {
            method: 'POST',
            headers: {
                Authorization: `Basic ${auth}`,
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: 'grant_type=client_credentials',
        });
        const tokenData = await tokenRes.json();
        const accessToken = tokenData.access_token;

        // Capture order
        const captureRes = await fetch(`${baseUrl}/v2/checkout/orders/${token}/capture`, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
            },
        });
        const captureData = await captureRes.json();
        isSuccessful = captureRes.ok && (captureData.status === 'COMPLETED' || captureData.status === 'APPROVED');
    } else if (providerName === 'stripe') {
        const sessionId = searchParams.get('session_id');
        if (!sessionId) throw new Error('Missing Stripe session ID');
        const stripe = new Stripe(secretKey);
        const session = await stripe.checkout.sessions.retrieve(sessionId);
        isSuccessful = session.payment_status === 'paid';
        
        if (isSuccessful && session.shipping_details) {
            // Update order with shipping details from Stripe if it was collected
            const orderId = searchParams.get('orderId');
            if (orderId) {
                const orderRef = adminDb.collection('orders').doc(orderId);
                const shipping = session.shipping_details;
                const address = `${shipping.address.line1}, ${shipping.address.line2 || ''}, ${shipping.address.city}, ${shipping.address.state}, ${shipping.address.postal_code}, ${shipping.address.country}`;
                await orderRef.update({
                    guestInfo: {
                        name: shipping.name,
                        email: session.customer_details?.email || '',
                        address: address
                    }
                });
            }
        }
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
