'use server';

import { adminDb } from '@/lib/firebase-admin';
import { RESERVED_SUBDOMAINS } from '@/lib/domain';

const VERCEL_TOKEN = process.env.VERCEL_TOKEN;
const VERCEL_PROJECT_ID = process.env.VERCEL_PROJECT_ID;
const VERCEL_TEAM_ID = process.env.VERCEL_TEAM_ID;

const getDb = () => {
    return adminDb;
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

export async function removeDomainFromVercel(domain: string) {
  if (!VERCEL_TOKEN || !VERCEL_PROJECT_ID) {
    console.warn('Vercel tokens not configured');
    return { success: true, mock: true };
  }

  const teamParam = VERCEL_TEAM_ID ? `?teamId=${VERCEL_TEAM_ID}` : '';
  const response = await fetch(
    `https://api.vercel.com/v9/projects/${VERCEL_PROJECT_ID}/domains/${domain}${teamParam}`,
    {
      headers: {
        Authorization: `Bearer ${VERCEL_TOKEN}`,
      },
      method: 'DELETE',
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

export async function isSubdomainAvailable(subdomain: string, excludeStoreId?: string) {
    const db = getDb();
    
    // 1. Check reserved names
    if (RESERVED_SUBDOMAINS.includes(subdomain.toLowerCase())) {
        return false;
    }

    // 2. Check if another store uses this as their custom subdomain
    const subdomainQuery = await db.collection('stores')
        .where('subdomain', '==', subdomain.toLowerCase())
        .get();
    
    if (!subdomainQuery.empty) {
        const otherStore = subdomainQuery.docs.find(doc => doc.id !== excludeStoreId);
        if (otherStore) return false;
    }
    
    // 3. Check if another store has this as their store ID (slug)
    const storeById = await db.collection('stores').doc(subdomain.toLowerCase()).get();
    if (storeById.exists && storeById.id !== excludeStoreId) {
        return false;
    }

    return true;
}

export async function updateStoreDomain(storeId: string, domain: string | null, subdomain: string | null) {
    const db = getDb();
    const storeDoc = await db.collection('stores').doc(storeId).get();
    const currentData = storeDoc.data();

    const updateData: any = {
        customDomain: domain,
        subdomain: subdomain,
        updatedAt: new Date(),
        domainStatus: domain ? 'pending' : 'none'
    };

    if (domain) {
        updateData.customDomainActive = true;
    }
    if (subdomain) {
        updateData.subdomainActive = true;
    }

    // Only reset verification if the custom domain changed
    if (currentData?.customDomain !== domain) {
        updateData.domainVerified = false;
        if (!domain) {
            updateData.domainActivatedAt = null;
        }
    }

    await db.collection('stores').doc(storeId).update(updateData);
    return { success: true };
}

export async function toggleDomainActive(storeId: string, isActive: boolean) {
    const db = getDb();
    await db.collection('stores').doc(storeId).update({
        customDomainActive: isActive,
        updatedAt: new Date()
    });
    return { success: true };
}

export async function toggleSubdomainActive(storeId: string, isActive: boolean) {
    const db = getDb();
    await db.collection('stores').doc(storeId).update({
        subdomainActive: isActive,
        updatedAt: new Date()
    });
    return { success: true };
}

export async function updateStorePrimaryDomain(storeId: string, type: 'free' | 'subdomain' | 'custom') {
    const db = getDb();
    await db.collection('stores').doc(storeId).update({
        primaryDomainType: type,
        updatedAt: new Date()
    });
    return { success: true };
}

export async function toggleDomainRedirect(storeId: string, enabled: boolean) {
    const db = getDb();
    await db.collection('stores').doc(storeId).update({
        redirectEnabled: enabled,
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
            domainStatus: 'active',
            domainActivatedAt: new Date(),
            updatedAt: new Date()
        });
        return { success: true };
    }
    
    // If check was successful but not configured, we could mark as pending or failed
    if (status.success && !status.data?.configured && !status.mock) {
         const db = getDb();
         await db.collection('stores').doc(storeId).update({
            domainStatus: 'failed', // or keep as pending
            updatedAt: new Date()
        });
    }

    return { success: false, error: 'Domain not yet configured or verified in DNS' };
}
