import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { Timestamp } from 'firebase-admin/firestore';
import { decrypt } from '@/lib/encryption';
import { PaymentProvider, Transaction } from '@/lib/types';
import Stripe from 'stripe';

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
    } else if (providerName === 'opay') {
        const opayRes = await fetch('https://api.opaycheckout.com/api/v1/international/cashier/create', {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${secretKey}`,
              'Content-Type': 'application/json',
              'MerchantId': config.merchantId,
            },
            body: JSON.stringify({
              amount: {
                total: Math.round(amount * 100),
                currency: normalizedCurrency,
              },
              reference,
              returnUrl: `${request.headers.get('origin')}/store/${storeId}/checkout/verify?provider=opay&reference=${reference}`,
              callbackUrl: `${request.headers.get('origin')}/api/payment/webhook?provider=opay&storeId=${storeId}`,
              userIdentify: email,
              productDesc: `Order ${orderId}`,
            }),
          });
          result = await opayRes.json();
          if (result.code !== '00000') {
            console.error('OPay Error:', result);
            throw new Error(result.message || 'OPay initialization failed');
          }
          // OPay returns data.cashierUrl
          result.data = { authorization_url: result.data.cashierUrl };
    } else if (providerName === 'palmpay') {
        // PalmPay initialization (Simplified version based on common PalmPay API patterns)
        const palmpayRes = await fetch('https://api.palmpay.com/v1/checkout/initialize', {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${secretKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              merchantId: config.merchantId,
              appId: mode === 'live' ? config.liveAppId : config.testAppId,
              reference,
              amount: Math.round(amount * 100),
              currency: normalizedCurrency,
              redirectUrl: `${request.headers.get('origin')}/store/${storeId}/checkout/verify?provider=palmpay&reference=${reference}`,
              callbackUrl: `${request.headers.get('origin')}/api/payment/webhook?provider=palmpay&storeId=${storeId}`,
              customerEmail: email,
            }),
          });
          result = await palmpayRes.json();
          if (result.code !== 'SUCCESS' && result.status !== 'success') {
            console.error('PalmPay Error:', result);
            throw new Error(result.message || 'PalmPay initialization failed');
          }
          // Assume PalmPay returns payment url in result.data.url or result.data.paymentUrl
          result.data = { authorization_url: result.data.url || result.data.paymentUrl || result.data.checkoutUrl };
    } else if (providerName === 'paypal') {
        const clientId = mode === 'live' ? config.liveClientId : config.clientId;
        const paypalSecret = mode === 'live' ? config.liveSecretKey : config.secretKey;
        const baseUrl = mode === 'live' ? 'https://api-m.paypal.com' : 'https://api-m.sandbox.paypal.com';

        if (!clientId || !paypalSecret) {
            throw new Error('PayPal credentials not configured');
        }

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
        if (!tokenRes.ok) {
            console.error('PayPal Auth Error:', tokenData);
            throw new Error(tokenData.error_description || 'PayPal auth failed');
        }

        const accessToken = tokenData.access_token;

        // Create order
        const orderRes = await fetch(`${baseUrl}/v2/checkout/orders`, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                intent: 'CAPTURE',
                purchase_units: [{
                    amount: {
                        currency_code: normalizedCurrency,
                        value: amount.toFixed(2),
                    },
                    reference_id: reference,
                }],
                application_context: {
                    return_url: `${request.headers.get('origin')}/store/${storeId}/checkout/verify?provider=paypal&reference=${reference}`,
                    cancel_url: `${request.headers.get('origin')}/store/${storeId}/checkout`,
                }
            }),
        });
        const orderData = await orderRes.json();
        if (!orderRes.ok) {
            console.error('PayPal Order Error:', orderData);
            throw new Error(orderData.message || 'PayPal order creation failed');
        }

        const approvalUrl = orderData.links.find((l: any) => l.rel === 'approve').href;
        result.data = { authorization_url: approvalUrl };
    } else if (providerName === 'stripe') {
        // Initialize Stripe
        const stripe = new Stripe(secretKey);
        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items: [{
                price_data: {
                    currency: normalizedCurrency.toLowerCase(),
                    product_data: {
                        name: `Order ${orderId}`,
                    },
                    unit_amount: Math.round(amount * 100),
                },
                quantity: 1,
            }],
            mode: 'payment',
            success_url: `${request.headers.get('origin')}/store/${storeId}/checkout/verify?provider=stripe&session_id={CHECKOUT_SESSION_ID}&orderId=${orderId}`,
            cancel_url: `${request.headers.get('origin')}/store/${storeId}/checkout`,
            customer_email: email,
            client_reference_id: reference,
            shipping_address_collection: {
                allowed_countries: ['US', 'CA', 'GB', 'NG', 'GH', 'KE'], // Add more as needed
            },
        });
        result.data = { authorization_url: session.url };
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
