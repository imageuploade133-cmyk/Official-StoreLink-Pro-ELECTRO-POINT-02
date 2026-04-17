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

    return NextResponse.json({ error: 'Unsupported provider' }, { status: 400 });
  } catch (error: any) {
    console.error('Error testing connection:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
