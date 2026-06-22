
import { adminDb as dbAdmin } from '@/lib/firebase-admin';
import { Timestamp } from 'firebase-admin/firestore';

export async function validateApiKey(apiKey: string) {
  if (!apiKey) return null;

  try {
    // 1. Check global settings first
    const globalSettingsDoc = await dbAdmin.collection('settings').doc('global').get();
    if (globalSettingsDoc.exists && globalSettingsDoc.data()?.integrationApiKey === apiKey) {
      return { storeId: 'global', isGlobal: true };
    }

    // 2. Check all stores - this might be slow if there are many stores, 
    // but without an index on integrationApiKey we have to query.
    // Optimization: query only active stores or use a dedicated lookup collection if needed.
    const storesSnapshot = await dbAdmin.collectionGroup('settings')
      .where('integrationApiKey', '==', apiKey)
      .get();

    if (!storesSnapshot.empty) {
        // settings/config is under stores/{storeId}/settings/config
        const settingsDoc = storesSnapshot.docs[0];
        const pathParts = settingsDoc.ref.path.split('/');
        // stores/STORE_ID/settings/config
        if (pathParts[0] === 'stores') {
            return { storeId: pathParts[1], isGlobal: false };
        }
    }

    // fallback for old settings structure stores/{storeId}/settings
    const oldStoresSnapshot = await dbAdmin.collection('settings')
        .where('integrationApiKey', '==', apiKey)
        .get();
    
    if (!oldStoresSnapshot.empty) {
        return { storeId: oldStoresSnapshot.docs[0].id, isGlobal: false };
    }

    return null;
  } catch (error) {
    console.error('validateApiKey error:', error);
    return null;
  }
}

export function mapV9ToStoreLink(v9Product: any, storeId: string) {
  return {
    name: v9Product.name,
    name_lowercase: v9Product.name?.toLowerCase() || '',
    sellingPrice: Number(v9Product.sellingPrice) || 0,
    purchasePrice: Number(v9Product.purchasePrice) || 0,
    stock: Number(v9Product.stock) || 0,
    categoryId: v9Product.categoryId || null,
    categoryName: v9Product.categoryName || null,
    sku: v9Product.sku || null,
    barcode: v9Product.barcode || null,
    description: v9Product.description || null,
    imageUrl: v9Product.imageUrl || null,
    lowStockThreshold: Number(v9Product.lowStockThreshold) || 10,
    isVisibleInPOS: v9Product.isVisibleInPOS !== false,
    isVisibleOnWeb: true, // Default to true for StoreLink Pro
    updatedAt: Timestamp.now(),
    store_id: storeId,
    integration: {
      source: 'v9-pos',
      sourceProductId: v9Product.id,
      syncedAt: Timestamp.now()
    }
  };
}

export async function upsertProduct(storeId: string, v9Product: any) {
  const productsCol = dbAdmin.collection('products');
  
  // Try to find existing product by sourceProductId or SKU/Barcode
  let existingDoc: any = null;
  
  // 1. Try by sourceProductId
  const bySourceId = await productsCol
    .where('store_id', '==', storeId)
    .where('integration.sourceProductId', '==', v9Product.id)
    .limit(1)
    .get();
    
  if (!bySourceId.empty) {
    existingDoc = bySourceId.docs[0];
  } else if (v9Product.sku) {
    // 2. Try by SKU
    const bySku = await productsCol
      .where('store_id', '==', storeId)
      .where('sku', '==', v9Product.sku)
      .limit(1)
      .get();
    if (!bySku.empty) existingDoc = bySku.docs[0];
  }

  const mappedData = mapV9ToStoreLink(v9Product, storeId);

  if (existingDoc) {
    await existingDoc.ref.update(mappedData);
    return { id: existingDoc.id, action: 'updated' };
  } else {
    const newDoc = await productsCol.add({
      ...mappedData,
      createdAt: Timestamp.now()
    });
    return { id: newDoc.id, action: 'created' };
  }
}
