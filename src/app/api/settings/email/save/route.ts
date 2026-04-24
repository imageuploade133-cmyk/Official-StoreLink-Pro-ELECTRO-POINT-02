import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { Timestamp } from 'firebase-admin/firestore';
import { encrypt, decrypt } from '@/lib/encryption';
import { verifyAuthDetailed, checkStoreAuthorization } from '@/lib/auth-admin-utils';

export async function POST(request: Request) {
  try {
    const { decodedToken, errorCode: authErrorCode } = await verifyAuthDetailed(request);
    if (!decodedToken) {
      return NextResponse.json({ error: authErrorCode }, { status: 401 });
    }

    const body = await request.json();
    const { provider, apiKey, senderName, senderEmail, enabled, storeId } = body;

    if (!storeId) {
      return NextResponse.json({ error: 'Store ID is required' }, { status: 400 });
    }

    const { authorized, errorCode: storeErrorCode, errorMessage } = await checkStoreAuthorization(decodedToken.uid, storeId);
    if (!authorized) {
      return NextResponse.json(
        { error: errorMessage || storeErrorCode }, 
        { status: storeErrorCode === 'missing_credentials' ? 500 : 403 }
      );
    }

    const notificationsRef = storeId === 'global' 
      ? adminDb.collection('settings').doc('notifications')
      : adminDb.collection('stores').doc(storeId).collection('settings').doc('notifications');
    
    // Fetch existing settings to merge if needed (especially for masking)
    const existingSnap = await notificationsRef.get();
    const existingData = existingSnap.data();
    
    let finalApiKey = apiKey;
    let isMasked = apiKey && apiKey.includes('****');

    if (existingSnap.exists && isMasked) {
      if (existingData?.apiKeyEncrypted) {
        try {
          finalApiKey = decrypt(existingData.apiKeyEncrypted);
        } catch (e) {
          console.error('Failed to decrypt existing API key:', e);
        }
      }
    }

    const encryptedApiKey = finalApiKey ? encrypt(finalApiKey) : '';
    
    // Create masked key for UI: example xsmt****0Qi
    let maskedKey = '';
    if (finalApiKey) {
      if (finalApiKey.length <= 8) {
        maskedKey = '********';
      } else {
        maskedKey = `${finalApiKey.substring(0, 4)}****${finalApiKey.substring(finalApiKey.length - 3)}`;
      }
    }
    
    const settingsData: any = {
      provider,
      apiKeyEncrypted: encryptedApiKey,
      maskedKey,
      senderName,
      senderEmail,
      enabled: !!enabled,
      updatedAt: Timestamp.now(),
    };

    await notificationsRef.set(settingsData, { merge: true });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error saving email settings:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
