import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { decrypt } from '@/lib/encryption';
import { PaymentProvider } from '@/lib/types';
import { verifyAuthDetailed, checkStoreAuthorization } from '@/lib/auth-admin-utils';

export async function GET(request: Request) {
  try {
    const { decodedToken, errorCode: authErrorCode } = await verifyAuthDetailed(request);
    if (!decodedToken) {
      return NextResponse.json({ error: authErrorCode }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const providerName = searchParams.get('provider');
    const storeId = searchParams.get('storeId') || 'global';

    if (!providerName) {
      return NextResponse.json({ error: 'Provider name is required' }, { status: 400 });
    }

    const { authorized, errorCode: storeErrorCode } = await checkStoreAuthorization(decodedToken.uid, storeId);
    if (!authorized) {
      return NextResponse.json({ error: storeErrorCode }, { status: 403 });
    }

    const providerId = `${storeId}_${providerName}`;
    const providerSnap = await adminDb.collection('payment_providers').doc(providerId).get();

    if (!providerSnap.exists) {
      return NextResponse.json({ error: 'Provider not configured' }, { status: 404 });
    }

    const data = providerSnap.data() as PaymentProvider;
    const config = JSON.parse(decrypt(data.config));
    const mode = data.mode || 'test';
    const secretKey = mode === 'live' ? config.liveSecretKey : config.testSecretKey || config.secretKey;

    if (providerName === 'paystack') {
      const res = await fetch('https://api.paystack.co/transaction/verify/test', {
        headers: {
          Authorization: `Bearer ${secretKey}`,
        },
      });
      if (res.status === 401) {
        return NextResponse.json({ success: false, error: 'Invalid Secret Key' });
      }
      return NextResponse.json({ success: true });
    }

    if (providerName === 'flutterwave') {
      const res = await fetch('https://api.flutterwave.com/v3/transactions', {
        headers: {
          Authorization: `Bearer ${secretKey}`,
        },
      });
      if (res.status === 401) {
        return NextResponse.json({ success: false, error: 'Invalid Secret Key' });
      }
      return NextResponse.json({ success: true });
    }

    if (providerName === 'opay') {
        const res = await fetch('https://api.opaycheckout.com/api/v1/international/cashier/status', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${secretKey}`,
            'Content-Type': 'application/json',
            'MerchantId': config.merchantId,
          },
          body: JSON.stringify({ reference: 'test-connection' }),
        });
        const result = await res.json();
        // If it returns a code other than unauthorized, we assume the keys are at least recognized
        if (result.code === '401' || res.status === 401) {
          return NextResponse.json({ success: false, error: 'Invalid OPay Credentials' });
        }
        return NextResponse.json({ success: true });
      }
  
      if (providerName === 'palmpay') {
        const res = await fetch(`https://api.palmpay.com/v1/checkout/query?reference=test&merchantId=${config.merchantId}`, {
          headers: { Authorization: `Bearer ${secretKey}` },
        });
        if (res.status === 401) {
          return NextResponse.json({ success: false, error: 'Invalid PalmPay Credentials' });
        }
        return NextResponse.json({ success: true });
      }

      if (providerName === 'paypal') {
        const clientId = mode === 'live' ? config.liveClientId : config.clientId;
        const paypalSecret = mode === 'live' ? config.liveSecretKey : config.secretKey;
        const baseUrl = mode === 'live' ? 'https://api-m.paypal.com' : 'https://api-m.sandbox.paypal.com';

        if (!clientId || !paypalSecret) {
            return NextResponse.json({ success: false, error: 'PayPal credentials not configured' });
        }

        const auth = Buffer.from(`${clientId}:${paypalSecret}`).toString('base64');
        const res = await fetch(`${baseUrl}/v1/oauth2/token`, {
          method: 'POST',
          headers: {
            Authorization: `Basic ${auth}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: 'grant_type=client_credentials',
        });
        if (!res.ok) {
          const result = await res.json();
          return NextResponse.json({ success: false, error: result.error_description || 'Invalid PayPal Credentials' });
        }
        return NextResponse.json({ success: true });
      }

      if (providerName === 'nowpayments') {
        const apiKey = config.apiKey;
        if (!apiKey) {
            return NextResponse.json({ success: false, error: 'NOWPayments API key not configured' });
        }

        const res = await fetch('https://api.nowpayments.io/v1/status', {
          headers: {
            'x-api-key': apiKey,
          },
        });
        
        if (!res.ok) {
          const result = await res.json();
          return NextResponse.json({ success: false, error: result.message || 'Invalid NOWPayments API Key' });
        }
        
        const result = await res.json();
        if (result.message === 'OK') {
            return NextResponse.json({ success: true });
        } else {
            return NextResponse.json({ success: false, error: result.message || 'Unexpected response from NOWPayments' });
        }
      }

      if (providerName === 'monnify') {
        const apiKey = mode === 'live' ? config.liveApiKey : config.testApiKey || config.apiKey;
        const secretKey = mode === 'live' ? config.liveSecretKey : config.testSecretKey || config.secretKey;
        const baseUrl = mode === 'live' ? 'https://api.monnify.com' : 'https://sandbox.monnify.com';

        if (!apiKey || !secretKey) {
          return NextResponse.json({ success: false, error: 'Monnify credentials not configured' });
        }

        const auth = Buffer.from(`${apiKey}:${secretKey}`).toString('base64');
        const res = await fetch(`${baseUrl}/api/v1/auth/login`, {
          method: 'POST',
          headers: {
            Authorization: `Basic ${auth}`,
          },
        });

        const result = await res.json();
        if (result.requestSuccessful) {
          return NextResponse.json({ success: true });
        } else {
          return NextResponse.json({ success: false, error: result.responseMessage || 'Invalid Monnify Credentials' });
        }
      }

    return NextResponse.json({ error: 'Unsupported provider' }, { status: 400 });
  } catch (error: any) {
    console.error('Error testing connection:', error);
    const message = error.message || 'Unknown error';
    if (message.includes('Could not load the default credentials')) {
        return NextResponse.json({ error: 'Missing Google Cloud credentials. Please ensure FIREBASE_SERVICE_ACCOUNT_KEY is set.' }, { status: 500 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
