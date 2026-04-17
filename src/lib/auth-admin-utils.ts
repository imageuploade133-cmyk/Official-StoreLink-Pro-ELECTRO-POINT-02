
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
    // Try direct document access first (fastest and most reliable)
    const directStaffDoc = await adminDb.collection('staff').doc(uid).get();
    if (directStaffDoc.exists) {
      const staffData = directStaffDoc.data();
      if ((staffData?.store_id === storeId || staffData?.storeId === storeId || staffData?.store_id === 'global') &&
          (staffData?.role === 'admin' || staffData?.permissions?.pages?.includes('manage_settings'))) {
        return true;
      }
    }
    
    // Also try uid_storeId format
    const combinedStaffDoc = await adminDb.collection('staff').doc(`${uid}_${storeId}`).get();
    if (combinedStaffDoc.exists) {
        const staffData = combinedStaffDoc.data();
        if (staffData?.role === 'admin' || staffData?.permissions?.pages?.includes('manage_settings')) {
            return true;
        }
    }

    // Search for staff documents with this uid
    // Use a simple query on uid to avoid compound index requirements
    const staffQuery = await adminDb.collection('staff').where('uid', '==', uid).get();
    
    for (const doc of staffQuery.docs) {
      const staffData = doc.data();
      const belongsToStore = staffData.store_id === storeId || staffData.storeId === storeId;
      const isGlobalAdmin = staffData.role === 'admin' && (staffData.store_id === 'global' || !staffData.store_id);
      
      if (belongsToStore || isGlobalAdmin) {
        if (staffData.role === 'admin' || staffData.permissions?.pages?.includes('manage_settings')) {
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
    // 1. Check if user is the store owner
    const storeDoc = await adminDb.collection('stores').doc(storeId).get();
    if (storeDoc.exists) {
      const storeData = storeDoc.data();
      // Support both owner_id and ownerId
      if (storeData?.owner_id === uid || storeData?.ownerId === uid) {
        return { authorized: true, errorCode: null };
      }
    }

    // 2. Check staff collection
    // Try direct document access first (fastest and most reliable)
    const directStaffDoc = await adminDb.collection('staff').doc(uid).get();
    if (directStaffDoc.exists) {
      const staffData = directStaffDoc.data();
      if ((staffData?.store_id === storeId || staffData?.storeId === storeId || staffData?.store_id === 'global') &&
          (staffData?.role === 'admin' || staffData?.permissions?.pages?.includes('manage_settings'))) {
        return { authorized: true, errorCode: null };
      }
    }
    
    // Also try uid_storeId format
    const combinedStaffDoc = await adminDb.collection('staff').doc(`${uid}_${storeId}`).get();
    if (combinedStaffDoc.exists) {
        const staffData = combinedStaffDoc.data();
        if (staffData?.role === 'admin' || staffData?.permissions?.pages?.includes('manage_settings')) {
            return { authorized: true, errorCode: null };
        }
    }

    // 3. Search for staff documents with this uid
    // Use a simple query on uid to avoid compound index requirements
    const staffQuery = await adminDb.collection('staff').where('uid', '==', uid).get();
    
    for (const doc of staffQuery.docs) {
      const staffData = doc.data();
      const belongsToStore = staffData.store_id === storeId || staffData.storeId === storeId;
      const isGlobalAdmin = staffData.role === 'admin' && (staffData.store_id === 'global' || !staffData.store_id);
      
      if (belongsToStore || isGlobalAdmin) {
        if (staffData.role === 'admin' || staffData.permissions?.pages?.includes('manage_settings')) {
          return { authorized: true, errorCode: null };
        }
      }
    }

    return { authorized: false, errorCode: 'not_store_owner' };
  } catch (error: any) {
    console.error('Error checking store authorization:', error);
    // Include error message in response to help debugging if needed
    // In production this would return a generic 'auth_check_failed' but here we can be more helpful
    return { authorized: false, errorCode: `auth_check_failed: ${error.message}` };
  }
}
