import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { PaymentProvider } from '@/lib/types';
import { decrypt } from '@/lib/encryption';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const storeId = searchParams.get('storeId') || 'global';

    const providersRef = adminDb.collection('payment_providers');
    const q = providersRef.where('storeId', '==', storeId).where('isActive', '==', true);
    const querySnapshot = await q.get();

    const methods: any[] = [];
    querySnapshot.forEach((doc) => {
      const data = doc.data() as PaymentProvider;
      let config: any = {};
      try {
        config = JSON.parse(decrypt(data.config));
      } catch (e) {}

      const mode = data.mode || 'test';
      const publicKey = mode === 'live' ? config.livePublicKey : config.testPublicKey || config.publicKey;

      methods.push({
        id: data.providerName,
        name: data.providerName === 'paystack' ? 'Pay with Card (Paystack)' : 
              data.providerName === 'flutterwave' ? 'Pay with Card (Flutterwave)' :
              data.providerName === 'manual' ? 'Bank Transfer' : data.providerName,
        provider: data.providerName,
        publicKey: publicKey, // Only expose correct public key
        mode: mode,
      });
    });

    return NextResponse.json(methods);
  } catch (error: any) {
    console.error('Error fetching payment methods:', error);
    const message = error.message || 'Unknown error';
    if (message.includes('Could not load the default credentials')) {
        return NextResponse.json({ error: 'Missing Google Cloud credentials. Please ensure FIREBASE_SERVICE_ACCOUNT_KEY is set.' }, { status: 500 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
