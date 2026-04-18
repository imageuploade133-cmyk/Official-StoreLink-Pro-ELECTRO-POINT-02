import { NextResponse } from 'next/server';
import { getFirestore } from 'firebase-admin/firestore';
import { initializeApp, getApps, cert } from 'firebase-admin/app';

const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
if (!serviceAccountKey) {
    throw new Error('FIREBASE_SERVICE_ACCOUNT_KEY is not defined');
}

const serviceAccount = JSON.parse(Buffer.from(serviceAccountKey, 'base64').toString());

if (!getApps().length) {
  initializeApp({
    credential: cert(serviceAccount),
  });
}

const db = getFirestore();

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const domain = searchParams.get('domain');
  const subdomain = searchParams.get('subdomain');

  console.log('Domain lookup:', { domain, subdomain });

  try {
    if (domain) {
      const storeQuery = await db.collection('stores')
        .where('customDomain', '==', domain)
        .where('plan', '==', 'premium')
        .where('domainVerified', '==', true)
        .limit(1)
        .get();

      if (!storeQuery.empty) {
        const store = storeQuery.docs[0].data();
        return NextResponse.json({ storeId: store.id });
      }
    }

    if (subdomain) {
      // For subdomains, we check if the store slug/id matches the subdomain
      const storeDoc = await db.collection('stores').doc(subdomain).get();
      if (storeDoc.exists) {
        const store = storeDoc.data();
        // Allow both Pro and Premium plans to use subdomains
        if (store?.plan === 'pro' || store?.plan === 'premium') {
          return NextResponse.json({ storeId: store.id });
        }
      }
    }

    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  } catch (error) {
    console.error('Domain lookup error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
