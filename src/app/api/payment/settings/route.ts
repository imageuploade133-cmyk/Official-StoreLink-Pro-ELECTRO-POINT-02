import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { Timestamp } from 'firebase-admin/firestore';
import { encrypt, decrypt } from '@/lib/encryption';
import { PaymentProvider } from '@/lib/types';
import { verifyAuthDetailed, checkStoreAuthorization } from '@/lib/auth-admin-utils';

export async function GET(request: Request) {
  try {
    const { decodedToken, errorCode: authErrorCode } = await verifyAuthDetailed(request);
    if (!decodedToken) {
      return NextResponse.json({ error: authErrorCode }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const storeId = searchParams.get('storeId') || 'global';

    const { authorized, errorCode: storeErrorCode } = await checkStoreAuthorization(decodedToken.uid, storeId);
    if (!authorized) {
      return NextResponse.json({ error: storeErrorCode }, { status: 403 });
    }

    const providersRef = adminDb.collection('payment_providers');
    const q = providersRef.where('storeId', '==', storeId);
    const querySnapshot = await q.get();

    const providers: any[] = [];
    querySnapshot.forEach((doc) => {
      const data = doc.data() as PaymentProvider;
      let config = {};
      try {
        if (data.config) {
          const decrypted = decrypt(data.config);
          config = JSON.parse(decrypted);
          // Mask secret keys for frontend
          if (config) {
            Object.keys(config).forEach(key => {
              if (key.toLowerCase().includes('secret') || key.toLowerCase().includes('encryption')) {
                const val = (config as any)[key];
                (config as any)[key] = val ? `********${val.slice(-4)}` : '';
              }
            });
          }
        }
      } catch (e) {
        console.error('Failed to decrypt config for', doc.id, e);
      }
      providers.push({
        ...data,
        id: doc.id,
        config, // Return masked config
      });
    });

    return NextResponse.json(providers);
  } catch (error: any) {
    console.error('Error fetching payment settings:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { decodedToken, errorCode: authErrorCode } = await verifyAuthDetailed(request);
    if (!decodedToken) {
      return NextResponse.json({ error: authErrorCode }, { status: 401 });
    }

    const body = await request.json();
    const { providerName, config, isActive, mode, storeId = 'global' } = body;

    if (!providerName) {
      return NextResponse.json({ error: 'Provider name is required' }, { status: 400 });
    }

    const { authorized, errorCode: storeErrorCode } = await checkStoreAuthorization(decodedToken.uid, storeId);
    if (!authorized) {
      return NextResponse.json({ error: storeErrorCode }, { status: 403 });
    }

    const providerId = `${storeId}_${providerName}`;
    const providerRef = adminDb.collection('payment_providers').doc(providerId);
    
    // Fetch existing provider data to merge config if it exists
    const existingSnap = await providerRef.get();
    let finalConfig = config || {};

    if (existingSnap.exists && config) {
      const existingData = existingSnap.data() as PaymentProvider;
      if (existingData.config) {
        try {
          const decryptedExisting = decrypt(existingData.config);
          const existingConfig = JSON.parse(decryptedExisting);
          // Merge: new config values override existing ones
          // This preserves keys that were masked and not sent back by the frontend
          finalConfig = { ...existingConfig, ...config };
        } catch (e) {
          console.error('Failed to merge with existing config:', e);
          // If decryption or parsing fails, we stick with what the user sent
        }
      }
    }

    const encryptedConfig = encrypt(JSON.stringify(finalConfig));
    
    const providerData: any = {
      storeId,
      providerName,
      config: encryptedConfig,
      updatedAt: Timestamp.now(),
    };

    if (isActive !== undefined) providerData.isActive = isActive;
    if (mode !== undefined) providerData.mode = mode;

    if (!existingSnap.exists) {
      providerData.createdAt = Timestamp.now();
    }

    await providerRef.set(providerData, { merge: true });

    return NextResponse.json({ success: true, id: providerId });
  } catch (error: any) {
    console.error('Error saving payment settings:', error);
    return NextResponse.json({ error: error.message || 'Unknown error occurred' }, { status: 500 });
  }
}
