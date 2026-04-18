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
  const storeId = searchParams.get('storeId');

  console.log('Domain lookup:', { domain, subdomain, storeId });

  try {
    if (storeId) {
      const storeDoc = await db.collection('stores').doc(storeId).get();
      if (storeDoc.exists) {
        const store = storeDoc.data();
        return NextResponse.json({ 
          storeId: storeDoc.id,
          plan: store?.plan,
          subdomain: store?.subdomain,
          customDomain: store?.customDomain,
          domainVerified: store?.domainVerified
        });
      }
    }

    if (domain) {
      const storeQuery = await db.collection('stores')
        .where('customDomain', '==', domain)
        .where('plan', '==', 'premium')
        .where('domainVerified', '==', true)
        .limit(1)
        .get();
      
      if (!storeQuery.empty) {
        const doc = storeQuery.docs[0];
        const store = doc.data();
        
        // Check if domain is active (default to true)
        if (store?.customDomainActive === false) {
          return NextResponse.json({ error: 'Domain deactivated' }, { status: 403 });
        }

        return NextResponse.json({ 
          storeId: doc.id,
          plan: store?.plan,
          subdomain: store?.subdomain,
          customDomain: store?.customDomain,
          domainVerified: store?.domainVerified
        });
      }
    }

    if (subdomain) {
      // 1. Check if the store slug/id matches the subdomain
      const storeDoc = await db.collection('stores').doc(subdomain.toLowerCase()).get();
      if (storeDoc.exists) {
        const store = storeDoc.data();
        if (store?.plan === 'pro' || store?.plan === 'premium') {
          // Check if subdomain is active (default to true)
          if (store?.subdomainActive !== false) {
            return NextResponse.json({ 
              storeId: storeDoc.id,
              plan: store?.plan,
              subdomain: store?.subdomain
            });
          }
        }
      }

      // 2. Check if any store has this as their custom subdomain field
      const subdomainQuery = await db.collection('stores')
        .where('subdomain', '==', subdomain.toLowerCase())
        .limit(1)
        .get();
      
      if (!subdomainQuery.empty) {
        const doc = subdomainQuery.docs[0];
        const store = doc.data();
        if (store?.plan === 'pro' || store?.plan === 'premium') {
          // Check if subdomain is active (default to true)
          if (store?.subdomainActive !== false) {
            return NextResponse.json({ 
              storeId: doc.id,
              plan: store?.plan,
              subdomain: store?.subdomain
            });
          }
        }
      }
    }

    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  } catch (error) {
    console.error('Domain lookup error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
