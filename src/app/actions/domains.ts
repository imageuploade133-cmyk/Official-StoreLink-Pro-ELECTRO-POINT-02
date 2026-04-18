'use server';

import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { getFirestore } from 'firebase-admin/firestore';
import { initializeApp, getApps, cert } from 'firebase-admin/app';

const VERCEL_TOKEN = process.env.VERCEL_TOKEN;
const VERCEL_PROJECT_ID = process.env.VERCEL_PROJECT_ID;
const VERCEL_TEAM_ID = process.env.VERCEL_TEAM_ID;

const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;

const getDb = () => {
    if (!getApps().length && serviceAccountKey) {
        initializeApp({
            credential: cert(JSON.parse(Buffer.from(serviceAccountKey, 'base64').toString())),
        });
    }
    return getFirestore();
};

export async function addDomainToVercel(domain: string) {
  if (!VERCEL_TOKEN || !VERCEL_PROJECT_ID) {
    console.warn('Vercel tokens not configured');
    return { success: true, mock: true }; // Allow mock for now
  }

  const teamParam = VERCEL_TEAM_ID ? `?teamId=${VERCEL_TEAM_ID}` : '';
  const response = await fetch(
    `https://api.vercel.com/v9/projects/${VERCEL_PROJECT_ID}/domains${teamParam}`,
    {
      body: JSON.stringify({ name: domain }),
      headers: {
        Authorization: `Bearer ${VERCEL_TOKEN}`,
        'Content-Type': 'application/json',
      },
      method: 'POST',
    }
  );

  const data = await response.json();
  if (!response.ok) {
    return { success: false, error: data.error };
  }

  return { success: true, data };
}

export async function checkDomainStatus(domain: string) {
  if (!VERCEL_TOKEN || !VERCEL_PROJECT_ID) {
    return { success: true, status: 'valid', mock: true };
  }

  const teamParam = VERCEL_TEAM_ID ? `?teamId=${VERCEL_TEAM_ID}` : '';
  const response = await fetch(
    `https://api.vercel.com/v9/projects/${VERCEL_PROJECT_ID}/domains/${domain}/config${teamParam}`,
    {
      headers: {
        Authorization: `Bearer ${VERCEL_TOKEN}`,
      },
      method: 'GET',
    }
  );

  const data = await response.json();
  return { success: response.ok, data };
}

export async function updateStorePlan(storeId: string, plan: 'free' | 'pro' | 'premium') {
    const db = getDb();
    await db.collection('stores').doc(storeId).update({
        plan,
        updatedAt: new Date()
    });
    return { success: true };
}

export async function updateStoreDomain(storeId: string, domain: string | null, subdomain: string | null) {
    const db = getDb();
    await db.collection('stores').doc(storeId).update({
        customDomain: domain,
        subdomain: subdomain,
        domainVerified: false,
        updatedAt: new Date()
    });
    return { success: true };
}

export async function verifyDomain(storeId: string, domain: string) {
    const status = await checkDomainStatus(domain);
    if (status.success && (status.data?.configured || status.mock)) {
        const db = getDb();
        await db.collection('stores').doc(storeId).update({
            domainVerified: true,
            updatedAt: new Date()
        });
        return { success: true };
    }
    return { success: false, error: 'Domain not yet configured or verified in DNS' };
}
