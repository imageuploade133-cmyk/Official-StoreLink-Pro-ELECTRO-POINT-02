
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
    // Check multiple possible document formats
    const staffDocs = await Promise.all([
      adminDb.collection('staff').doc(uid).get(),
      adminDb.collection('staff').doc(`${uid}_${storeId}`).get()
    ]);
    
    for (const staffDoc of staffDocs) {
      if (staffDoc.exists) {
        const staffData = staffDoc.data();
        if (staffData?.store_id === storeId || staffData?.storeId === storeId) {
            if (staffData?.role === 'admin' || staffData?.permissions?.pages?.includes('manage_settings')) {
              return true;
            }
        }
      }
    }

    // Also check by query in case doc IDs are random
    const staffQuery = await adminDb.collection('staff')
      .where('uid', '==', uid)
      .where('store_id', '==', storeId)
      .limit(1)
      .get();
    
    if (!staffQuery.empty) {
      const staffData = staffQuery.docs[0].data();
      if (staffData?.role === 'admin' || staffData?.permissions?.pages?.includes('manage_settings')) {
        return true;
      }
    }

    // Also check for storeId with capital I
    const staffQueryCapital = await adminDb.collection('staff')
      .where('uid', '==', uid)
      .where('storeId', '==', storeId)
      .limit(1)
      .get();
    
    if (!staffQueryCapital.empty) {
      const staffData = staffQueryCapital.docs[0].data();
      if (staffData?.role === 'admin' || staffData?.permissions?.pages?.includes('manage_settings')) {
        return true;
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
    if (storeDoc.exists) {
      const storeData = storeDoc.data();
      // Support both owner_id and ownerId
      if (storeData?.owner_id === uid || storeData?.ownerId === uid) {
        return { authorized: true, errorCode: null };
      }
    }

    // Check if user is staff with manage_settings permission
    // Check multiple possible document formats
    const staffDocs = await Promise.all([
      adminDb.collection('staff').doc(uid).get(),
      adminDb.collection('staff').doc(`${uid}_${storeId}`).get()
    ]);
    
    for (const staffDoc of staffDocs) {
      if (staffDoc.exists) {
        const staffData = staffDoc.data();
        if (staffData?.store_id === storeId || staffData?.storeId === storeId) {
            if (staffData?.role === 'admin' || staffData?.permissions?.pages?.includes('manage_settings')) {
              return { authorized: true, errorCode: null };
            }
        }
      }
    }

    // Also check by query in case doc IDs are random
    const staffQuery = await adminDb.collection('staff')
      .where('uid', '==', uid)
      .where('store_id', '==', storeId)
      .limit(1)
      .get();
    
    if (!staffQuery.empty) {
      const staffData = staffQuery.docs[0].data();
      if (staffData?.role === 'admin' || staffData?.permissions?.pages?.includes('manage_settings')) {
        return { authorized: true, errorCode: null };
      }
    }

    // One more check for storeId with capital I in the query
    const staffQuery2 = await adminDb.collection('staff')
      .where('uid', '==', uid)
      .where('storeId', '==', storeId)
      .limit(1)
      .get();
    
    if (!staffQuery2.empty) {
      const staffData = staffQuery2.docs[0].data();
      if (staffData?.role === 'admin' || staffData?.permissions?.pages?.includes('manage_settings')) {
        return { authorized: true, errorCode: null };
      }
    }

    // Final fallback: if the user is a global admin (staff with role admin and no specific store or store_id is global)
    const globalAdminQuery = await adminDb.collection('staff')
      .where('uid', '==', uid)
      .where('role', '==', 'admin')
      .limit(1)
      .get();
    
    if (!globalAdminQuery.empty) {
      const globalStaffData = globalAdminQuery.docs[0].data();
      if (globalStaffData.store_id === 'global' || !globalStaffData.store_id) {
        return { authorized: true, errorCode: null };
      }
    }

  } catch (error) {
    console.error('Error checking store authorization:', error);
    return { authorized: false, errorCode: 'auth_check_failed' };
  }

  return { authorized: false, errorCode: 'not_store_owner' };
}
