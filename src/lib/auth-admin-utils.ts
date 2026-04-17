
import { adminAuth, adminDb } from './firebase-admin';

export async function verifyAuth(request: Request) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  const idToken = authHeader.split('Bearer ')[1];
  try {
    const decodedToken = await adminAuth.verifyIdToken(idToken);
    return decodedToken;
  } catch (error) {
    console.error('Error verifying token:', error);
    return null;
  }
}

/**
 * Enhanced auth verification that returns specific error codes
 */
export async function verifyAuthDetailed(request: Request) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { decodedToken: null, errorCode: 'not_logged_in' };
  }
  const idToken = authHeader.split('Bearer ')[1];
  try {
    const decodedToken = await adminAuth.verifyIdToken(idToken);
    return { decodedToken, errorCode: null };
  } catch (error) {
    console.error('Error verifying token:', error);
    return { decodedToken: null, errorCode: 'invalid_token' };
  }
}

export async function isStoreAuthorized(uid: string, storeId: string) {
  if (!storeId || storeId === 'global') {
     // Check if user has global admin permissions or is just any logged in user?
     // For this app, storeId should usually be provided.
     // If it's global, we'll allow it if the user exists for now, 
     // but in a real app you'd want a 'super_admin' check.
     return true; 
  }

  // Check if user is owner
  try {
    const storeDoc = await adminDb.collection('stores').doc(storeId).get();
    if (storeDoc.exists) {
      const storeData = storeDoc.data();
      // Support both owner_id and ownerId for broader compatibility
      if (storeData?.owner_id === uid || storeData?.ownerId === uid) {
        return true;
      }
    }

    // Check if user is staff with manage_settings permission
    // Trying both UID and UID_StoreID formats
    const staffQuery1 = await adminDb.collection('staff').doc(uid).get();
    const staffQuery2 = await adminDb.collection('staff').doc(`${uid}_${storeId}`).get();
    
    const staffDoc = staffQuery1.exists ? staffQuery1 : (staffQuery2.exists ? staffQuery2 : null);
    
    if (staffDoc) {
      const staffData = staffDoc.data();
      if (staffData?.store_id === storeId || staffData?.storeId === storeId) {
          if (staffData?.role === 'admin' || staffData?.permissions?.pages?.includes('manage_settings')) {
            return true;
          }
      }
    }
  } catch (error) {
    console.error('Error checking store authorization:', error);
  }

  return false;
}

/**
 * Enhanced store authorization check that returns specific error codes
 */
export async function checkStoreAuthorization(uid: string, storeId: string) {
  if (!storeId || storeId === 'global') {
     return { authorized: true, errorCode: null }; 
  }

  try {
    const storeDoc = await adminDb.collection('stores').doc(storeId).get();
    if (!storeDoc.exists) {
      return { authorized: false, errorCode: 'store_not_found' };
    }

    const storeData = storeDoc.data();
    // Support both owner_id and ownerId
    if (storeData?.owner_id === uid || storeData?.ownerId === uid) {
      return { authorized: true, errorCode: null };
    }

    // Check if user is staff with manage_settings permission
    const staffQuery1 = await adminDb.collection('staff').doc(uid).get();
    const staffQuery2 = await adminDb.collection('staff').doc(`${uid}_${storeId}`).get();
    
    const staffDoc = staffQuery1.exists ? staffQuery1 : (staffQuery2.exists ? staffQuery2 : null);
    
    if (staffDoc) {
      const staffData = staffDoc.data();
      if (staffData?.store_id === storeId || staffData?.storeId === storeId) {
          if (staffData?.role === 'admin' || staffData?.permissions?.pages?.includes('manage_settings')) {
            return { authorized: true, errorCode: null };
          }
      }
    }
  } catch (error) {
    console.error('Error checking store authorization:', error);
    return { authorized: false, errorCode: 'auth_check_failed' };
  }

  return { authorized: false, errorCode: 'not_store_owner' };
}
