import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { Timestamp } from 'firebase-admin/firestore';
import { decrypt } from '@/lib/encryption';
import { PaymentProvider, Transaction } from '@/lib/types';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { orderId, amount, currency, email, providerName, storeId = 'global', userId } = body;

    if (!orderId || !amount || !email || !providerName) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const providerId = `${storeId}_${providerName}`;
    const providerSnap = await adminDb.collection('payment_providers').doc(providerId).get();

    if (!providerSnap.exists || !providerSnap.data()?.isActive) {
      return NextResponse.json({ error: 'Payment provider not active' }, { status: 400 });
    }

    const providerData = providerSnap.data() as PaymentProvider;
    const config = JSON.parse(decrypt(providerData.config));
    const mode = providerData.mode || 'test';

    // Normalize currency to ISO 3-letter code
    const normalizeCurrency = (curr: string) => {
      const map: Record<string, string> = {
        '₦': 'NGN',
        '$': 'USD',
        '€': 'EUR',
        '£': 'GBP',
        '₵': 'GHS',
        'GH₵': 'GHS',
        'KSH': 'KES',
        'KSHS': 'KES',
      };
      const upper = curr?.toUpperCase().trim() || 'NGN';
      return map[upper] || map[curr] || upper;
    };

    const normalizedCurrency = normalizeCurrency(currency);
    
    // Pick the correct keys based on mode
    const secretKey = mode === 'live' ? config.liveSecretKey : config.testSecretKey || config.secretKey;
    
    let result: any = {};
    let reference = `TRX-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    if (providerName === 'paystack') {
      const paystackRes = await fetch('https://api.paystack.co/transaction/initialize', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${secretKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          amount: Math.round(amount * 100), // Paystack uses kobo/cents
          currency: normalizedCurrency,
          reference,
          callback_url: `${request.headers.get('origin')}/store/${storeId}/checkout/verify?provider=paystack`,
        }),
      });
      result = await paystackRes.json();
      if (!result.status) {
        console.error('Paystack Error:', result);
        throw new Error(result.message || 'Paystack initialization failed');
      }
    } else if (providerName === 'flutterwave') {
        const flutterwaveRes = await fetch('https://api.flutterwave.com/v3/payments', {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${secretKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              tx_ref: reference,
              amount,
              currency: normalizedCurrency,
              redirect_url: `${request.headers.get('origin')}/store/${storeId}/checkout/verify?provider=flutterwave`,
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
            console.error('Flutterwave Error:', result);
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
      user_id: userId || 'GUEST',
      provider: providerName,
      reference,
      amount,
      currency: normalizedCurrency,
      status: 'pending',
      customerEmail: email,
      createdAt: Timestamp.now() as any,
      updatedAt: Timestamp.now() as any,
    };

    await adminDb.collection('transactions').doc(transactionId).set(transactionData);

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
