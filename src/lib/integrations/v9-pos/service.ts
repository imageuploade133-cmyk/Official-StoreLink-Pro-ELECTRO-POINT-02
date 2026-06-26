import { adminDb as dbAdmin } from '@/lib/firebase-admin';
import { Timestamp } from 'firebase-admin/firestore';

function ensureAdminDb() {
  if (!dbAdmin) throw new Error('Firebase Admin is not initialized');
  return dbAdmin;
}

export async function validateApiKey(apiKey: string) {
  if (!apiKey) return null;
  try {
    const db = ensureAdminDb();
    const globalSettingsDoc = await db.collection('settings').doc('global').get();
    if (globalSettingsDoc.exists && globalSettingsDoc.data()?.integrationApiKey === apiKey) {
      return { storeId: 'global', isGlobal: true };
    }
    const storesSnapshot = await db.collectionGroup('settings').where('integrationApiKey', '==', apiKey).get();
    if (!storesSnapshot.empty) {
      const settingsDoc = storesSnapshot.docs[0];
      const pathParts = settingsDoc.ref.path.split('/');
      if (pathParts[0] === 'stores' && pathParts[1]) {
        return { storeId: pathParts[1], isGlobal: false };
      }
    }
    return null;
  } catch (error) {
    return null;
  }
}

export function mapV9ToStoreLink(v9Product: any, storeId: string) {
  const safeName = v9Product?.name?.trim() || 'Unnamed Product';
  return {
    name: safeName,
    name_lowercase: safeName.toLowerCase(),
    sellingPrice: Number(v9Product?.sellingPrice || v9Product?.selling_price) || 0,
    purchasePrice: Number(v9Product?.purchasePrice || v9Product?.cost_price) || 0,
    stock: Number(v9Product?.stock || v9Product?.stock_quantity) || 0,
    categoryId: v9Product?.categoryId || v9Product?.category || null,
    sku: v9Product?.sku || null,
    barcode: v9Product?.barcode || null,
    description: v9Product?.description || null,
    imageUrl: v9Product?.imageUrl || v9Product?.image_url || null,
    lowStockThreshold: Number(v9Product?.lowStockThreshold || v9Product?.reorder_level) || 10,
    isVisibleInPOS: v9Product?.isVisibleInPOS !== false,
    isVisibleOnWeb: true,
    updatedAt: Timestamp.now(),
    store_id: storeId,
    integration: {
      source: 'v9-pos',
      sourceProductId: v9Product?.id || null,
      syncedAt: Timestamp.now(),
    },
  };
}

export async function upsertProduct(storeId: string, v9Product: any) {
  const db = ensureAdminDb();
  const productsCol = db.collection('products');
  let existingDoc: any = null;

  if (v9Product?.id) {
    const bySourceId = await productsCol.where('store_id', '==', storeId).where('integration.sourceProductId', '==', v9Product.id).limit(1).get();
    if (!bySourceId.empty) existingDoc = bySourceId.docs[0];
  }

  if (!existingDoc && v9Product?.barcode) {
    const byBarcode = await productsCol.where('store_id', '==', storeId).where('barcode', '==', v9Product.barcode).limit(1).get();
    if (!byBarcode.empty) existingDoc = byBarcode.docs[0];
  }

  const mappedData = mapV9ToStoreLink(v9Product, storeId);
  if (existingDoc) {
    await existingDoc.ref.update(mappedData);
    return { id: existingDoc.id, action: 'updated' };
  }
  const newDoc = await productsCol.add({ ...mappedData, createdAt: Timestamp.now() });
  return { id: newDoc.id, action: 'created' };
}
