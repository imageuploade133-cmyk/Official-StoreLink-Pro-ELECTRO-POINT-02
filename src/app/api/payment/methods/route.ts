import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { PaymentProvider } from '@/lib/types';
import { decrypt } from '@/lib/encryption';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const storeId = searchParams.get('storeId') || 'global';

    const providersRef = adminDb.collection('payment_providers');
    
    let querySnapshot;
    try {
      // Try querying by storeId (new format)
      querySnapshot = await providersRef.where('storeId', '==', storeId).where('isActive', '==', true).get();
      
      // If empty and not global, try store_id (migrated format)
      if (querySnapshot.empty && storeId !== 'global') {
        querySnapshot = await providersRef.where('store_id', '==', storeId).where('isActive', '==', true).get();
      }
    } catch (dbError: any) {
      console.error('Database error fetching payment providers:', dbError);
      
      // FALLBACK: If database fails (e.g. missing credentials), return Paystack if keys are in env
      if (process.env.PAYSTACK_PUBLIC_KEY) {
        return NextResponse.json([{
          id: 'paystack',
          name: 'Pay with Card (Paystack)',
          provider: 'paystack',
          publicKey: process.env.PAYSTACK_PUBLIC_KEY,
          mode: process.env.PAYSTACK_PUBLIC_KEY.startsWith('pk_live') ? 'live' : 'test',
        }]);
      }
      throw dbError; // Rethrow if no fallback possible
    }

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
              data.providerName === 'opay' ? 'Pay with OPay' :
              data.providerName === 'palmpay' ? 'Pay with PalmPay' :
              data.providerName === 'paypal' ? 'Pay with PayPal' :
              data.providerName === 'stripe' ? 'Pay with Card (Stripe)' :
              data.providerName === 'nowpayments' ? 'Pay with Crypto' :
              data.providerName === 'monnify' ? 'Pay with Monnify' :
              data.providerName === 'manual' ? 'Bank Transfer' :

        provider: data.providerName,
        publicKey: publicKey, // Only expose correct public key
        mode: mode,
        instructions: config.instructions || '',
        config: data.providerName === 'fast_checkout' ? config : undefined,
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
