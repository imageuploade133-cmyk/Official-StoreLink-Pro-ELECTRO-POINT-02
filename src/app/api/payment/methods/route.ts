import { NextResponse } from 'next/server';
import { initializeFirebase } from '@/firebase/init';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { PaymentProvider } from '@/lib/types';
import { decrypt } from '@/lib/encryption';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const storeId = searchParams.get('storeId') || 'global';

    const { firestore } = initializeFirebase();
    const providersRef = collection(firestore, 'payment_providers');
    const q = query(providersRef, where('storeId', '==', storeId), where('isActive', '==', true));
    const querySnapshot = await getDocs(q);

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
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
