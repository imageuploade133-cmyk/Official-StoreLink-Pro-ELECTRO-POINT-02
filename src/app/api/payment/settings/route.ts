import { NextResponse } from 'next/server';
import { initializeFirebase } from '@/firebase/init';
import { doc, getDoc, setDoc, collection, getDocs, query, where, Timestamp } from 'firebase/firestore';
import { encrypt, decrypt } from '@/lib/encryption';
import { PaymentProvider } from '@/lib/types';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const storeId = searchParams.get('storeId') || 'global';

    const { firestore } = initializeFirebase();
    const providersRef = collection(firestore, 'payment_providers');
    const q = query(providersRef, where('storeId', '==', storeId));
    const querySnapshot = await getDocs(q);

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
    const body = await request.json();
    const { providerName, config, isActive, mode, storeId = 'global' } = body;

    if (!providerName) {
      return NextResponse.json({ error: 'Provider name is required' }, { status: 400 });
    }

    const { firestore } = initializeFirebase();
    
    // In a real app, we'd verify the user has permission to manage settings for this storeId

    const encryptedConfig = encrypt(JSON.stringify(config));
    
    const providerId = `${storeId}_${providerName}`;
    const providerRef = doc(firestore, 'payment_providers', providerId);
    
    const providerData: Partial<PaymentProvider> = {
      storeId,
      providerName,
      config: encryptedConfig,
      isActive,
      mode,
      updatedAt: Timestamp.now(),
    };

    // If it's a new provider, add createdAt
    const existingSnap = await getDoc(providerRef);
    if (!existingSnap.exists()) {
      providerData.createdAt = Timestamp.now();
    }

    await setDoc(providerRef, providerData, { merge: true });

    return NextResponse.json({ success: true, id: providerId });
  } catch (error: any) {
    console.error('Error saving payment settings:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
