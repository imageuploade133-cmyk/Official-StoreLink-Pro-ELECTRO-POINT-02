import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';

export const dynamic = 'force-dynamic';
import { PaymentProvider } from '@/lib/types';
import { decrypt } from '@/lib/encryption';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const storeId = searchParams.get('storeId') || 'global';

    let querySnapshot;
    try {
      const providersRef = adminDb.collection('payment_providers');

      // Try querying by storeId (new format)
      querySnapshot = await providersRef.where('storeId', '==', storeId).where('isActive', '==', true).get();
      
      // If empty and not global, try store_id (migrated format)
      if (querySnapshot.empty && storeId !== 'global') {
        querySnapshot = await providersRef.where('store_id', '==', storeId).where('isActive', '==', true).get();
      }
    } catch (dbError: any) {
      console.error('Database error fetching payment providers:', dbError);
      
      // FALLBACK: If database fails (e.g. missing credentials in production), return Paystack or Bank Transfer method
      const paystackKey = process.env.PAYSTACK_PUBLIC_KEY || process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY;
      if (paystackKey) {
        return NextResponse.json([{
          id: 'paystack',
          name: 'Pay with Card (Paystack)',
          provider: 'paystack',
          publicKey: paystackKey,
          mode: paystackKey.startsWith('pk_live') ? 'live' : 'test',
        }], { status: 200 });
      }
      
      return NextResponse.json([{
        id: 'manual',
        name: 'Bank Transfer',
        provider: 'manual',
        mode: 'live',
      }], { status: 200 });
    }

    const methods: any[] = [];
    if (querySnapshot && !querySnapshot.empty) {
        querySnapshot.forEach((doc) => {
          const data = doc.data() as PaymentProvider;
          let config: any = {};
          if (data.config) {
              try {
                config = JSON.parse(decrypt(data.config));
              } catch (e) {
                console.error(`Error decrypting config for provider ${data.providerName}:`, e);
              }
          }

          const mode = data.mode || 'test';
          const publicKey = mode === 'live' ? config.livePublicKey : config.testPublicKey || config.publicKey;

          methods.push({
            id: doc.id || data.providerName,
            name: data.providerName === 'paystack' ? 'Pay with Card (Paystack)' : 
                  data.providerName === 'flutterwave' ? 'Pay with Card (Flutterwave)' :
                  data.providerName === 'opay' ? 'Pay with OPay' :
                  data.providerName === 'palmpay' ? 'Pay with PalmPay' :
                  data.providerName === 'paypal' ? 'Pay with PayPal' :
                  data.providerName === 'stripe' ? 'Pay with Card (Stripe)' :
                  data.providerName === 'nowpayments' ? 'Pay with Crypto' :
                  data.providerName === 'monnify' ? 'Pay with Monnify' :
                  data.providerName === 'adyen' ? 'Pay with Adyen' :
                  data.providerName === 'manual' ? 'Bank Transfer' : data.providerName,

            provider: data.providerName,
            publicKey: publicKey, // Only expose correct public key
            mode: mode,
            instructions: config.instructions || '',
            config: data.providerName === 'fast_checkout' ? config : undefined,
            allowedLocations: data.allowedLocations || [],
            paymentRegion: data.paymentRegion || '',
            logoUrl: config.logoUrl || '',
          });
        });
    }

    // Fallback if empty
    if (methods.length === 0) {
      const paystackKey = process.env.PAYSTACK_PUBLIC_KEY || process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY;
      if (paystackKey) {
        methods.push({
          id: 'paystack',
          name: 'Pay with Card (Paystack)',
          provider: 'paystack',
          publicKey: paystackKey,
          mode: paystackKey.startsWith('pk_live') ? 'live' : 'test',
        });
      } else {
        methods.push({
          id: 'manual',
          name: 'Bank Transfer',
          provider: 'manual',
          mode: 'live',
        });
      }
    }

    return NextResponse.json(methods, { status: 200 });
  } catch (error: any) {
    console.error('Error fetching payment methods:', error);
    return NextResponse.json([{
      id: 'manual',
      name: 'Bank Transfer',
      provider: 'manual',
      mode: 'live',
    }], { status: 200 });
  }
}
