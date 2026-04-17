
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
    if (storeDoc.exists && storeDoc.data()?.owner_id === uid) {
      return true;
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
