import { NextResponse } from 'next/server';
import { initializeFirebase } from '@/firebase/init';
import { doc, getDoc, collection, setDoc, Timestamp } from 'firebase/firestore';
import { decrypt } from '@/lib/encryption';
import { PaymentProvider, Transaction } from '@/lib/types';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { orderId, amount, currency, email, providerName, storeId = 'global' } = body;

    if (!orderId || !amount || !email || !providerName) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const { firestore } = initializeFirebase();
    const providerId = `${storeId}_${providerName}`;
    const providerSnap = await getDoc(doc(firestore, 'payment_providers', providerId));

    if (!providerSnap.exists() || !providerSnap.data().isActive) {
      return NextResponse.json({ error: 'Payment provider not active' }, { status: 400 });
    }

    const providerData = providerSnap.data() as PaymentProvider;
    const config = JSON.parse(decrypt(providerData.config));

    let result: any = {};
    let reference = `TRX-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    if (providerName === 'paystack') {
      const paystackRes = await fetch('https://api.paystack.co/transaction/initialize', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${config.secretKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          amount: Math.round(amount * 100), // Paystack uses kobo/cents
          currency,
          reference,
          callback_url: `${request.headers.get('origin')}/store/checkout/verify?provider=paystack`,
        }),
      });
      result = await paystackRes.json();
      if (!result.status) {
        throw new Error(result.message || 'Paystack initialization failed');
      }
    } else if (providerName === 'flutterwave') {
        const flutterwaveRes = await fetch('https://api.flutterwave.com/v3/payments', {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${config.secretKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              tx_ref: reference,
              amount,
              currency,
              redirect_url: `${request.headers.get('origin')}/store/checkout/verify?provider=flutterwave`,
              customer: {
                email,
              },
              customizations: {
                title: 'Order Payment',
              },
            }),
          });
          result = await flutterwaveRes.json();
          if (result.status !== 'success') {
            throw new Error(result.message || 'Flutterwave initialization failed');
          }
    } else {
        throw new Error('Unsupported provider');
    }

    // Save transaction to database
    const transactionId = reference;
    const transactionData: Transaction = {
      id: transactionId,
      storeId,
      orderId,
      provider: providerName,
      reference,
      amount,
      currency,
      status: 'pending',
      customerEmail: email,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    };

    await setDoc(doc(firestore, 'transactions', transactionId), transactionData);

    return NextResponse.json({
        success: true,
        authorization_url: result.data.authorization_url || result.data.link,
        reference,
    });

  } catch (error: any) {
    console.error('Error initializing payment:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
