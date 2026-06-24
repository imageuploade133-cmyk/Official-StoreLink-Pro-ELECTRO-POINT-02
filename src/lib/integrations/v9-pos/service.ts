import { adminDb as dbAdmin } from '@/lib/firebase-admin';
import { Timestamp } from 'firebase-admin/firestore';

function ensureAdminDb() {
  if (!dbAdmin) {
    throw new Error('Firebase Admin is not initialized in StoreLink Pro');
  }
  return dbAdmin;
}

export async function validateApiKey(apiKey: string) {
  if (!apiKey) return null;

  try {
    const db = ensureAdminDb();

    console.log('[StoreLink Pro][validateApiKey] validating API key');

    // 1) Check global settings first
    const globalSettingsDoc = await db.collection('settings').doc('global').get();

    if (
      globalSettingsDoc.exists &&
      globalSettingsDoc.data()?.integrationApiKey === apiKey
    ) {
      console.log('[StoreLink Pro][validateApiKey] matched global API key');
      return { storeId: 'global', isGlobal: true };
    }

    // 2) Check nested store settings structure: stores/{storeId}/settings/config
    const storesSnapshot = await db
      .collectionGroup('settings')
      .where('integrationApiKey', '==', apiKey)
      .get();

    if (!storesSnapshot.empty) {
      const settingsDoc = storesSnapshot.docs[0];
      const pathParts = settingsDoc.ref.path.split('/');

      // Expected: stores/{storeId}/settings/{docId}
      if (pathParts[0] === 'stores' && pathParts[1]) {
        console.log('[StoreLink Pro][validateApiKey] matched nested store settings', {
          storeId: pathParts[1],
          path: settingsDoc.ref.path,
        });
        return { storeId: pathParts[1], isGlobal: false };
      }
    }

    // 3) Fallback for old structure
    const oldStoresSnapshot = await db
      .collection('settings')
      .where('integrationApiKey', '==', apiKey)
      .get();

    if (!oldStoresSnapshot.empty) {
      console.log('[StoreLink Pro][validateApiKey] matched legacy settings structure', {
        storeId: oldStoresSnapshot.docs[0].id,
      });
      return { storeId: oldStoresSnapshot.docs[0].id, isGlobal: false };
    }

    console.log('[StoreLink Pro][validateApiKey] no matching API key found');
    return null;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const stack = error instanceof Error ? error.stack : undefined;

    console.error('[StoreLink Pro][validateApiKey] error', {
      message,
      stack,
    });

    return null;
  }
}

export function mapV9ToStoreLink(v9Product: any, storeId: string) {
  const safeName =
    typeof v9Product?.name === 'string' && v9Product.name.trim()
      ? v9Product.name.trim()
      : 'Unnamed Product';

  return {
    name: safeName,
    name_lowercase: safeName.toLowerCase(),
    sellingPrice: Number(v9Product?.sellingPrice) || 0,
    purchasePrice: Number(v9Product?.purchasePrice) || 0,
    stock: Number(v9Product?.stock) || 0,
    categoryId: v9Product?.categoryId || null,
    categoryName: v9Product?.categoryName || null,
    sku: v9Product?.sku || null,
    barcode: v9Product?.barcode || null,
    description: v9Product?.description || null,
    imageUrl: v9Product?.imageUrl || null,
    lowStockThreshold: Number(v9Product?.lowStockThreshold) || 10,
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
  try {
    const db = ensureAdminDb();

    if (!storeId) {
      throw new Error('Missing storeId for product upsert');
    }

    if (!v9Product || typeof v9Product !== 'object') {
      throw new Error('Invalid product payload');
    }

    const productsCol = db.collection('products');

    let existingDoc: any = null;

    console.log('[StoreLink Pro][upsertProduct] processing product', {
      storeId,
      sourceProductId: v9Product?.id || null,
      sku: v9Product?.sku || null,
      name: v9Product?.name || null,
    });

    // 1) Match by sourceProductId if available
    if (v9Product?.id) {
      const bySourceId = await productsCol
        .where('store_id', '==', storeId)
        .where('integration.sourceProductId', '==', v9Product.id)
        .limit(1)
        .get();

      if (!bySourceId.empty) {
        existingDoc = bySourceId.docs[0];
      }
    }

    // 2) Match by SKU if not found
    if (!existingDoc && v9Product?.sku) {
      const bySku = await productsCol
        .where('store_id', '==', storeId)
        .where('sku', '==', v9Product.sku)
        .limit(1)
        .get();

      if (!bySku.empty) {
        existingDoc = bySku.docs[0];
      }
    }

    // 3) Optional: match by barcode if not found
    if (!existingDoc && v9Product?.barcode) {
      const byBarcode = await productsCol
        .where('store_id', '==', storeId)
        .where('barcode', '==', v9Product.barcode)
        .limit(1)
        .get();

      if (!byBarcode.empty) {
        existingDoc = byBarcode.docs[0];
      }
    }

    const mappedData = mapV9ToStoreLink(v9Product, storeId);

    if (existingDoc) {
      await existingDoc.ref.update(mappedData);
      console.log('[StoreLink Pro][upsertProduct] updated product', {
        productId: existingDoc.id,
      });
      return { id: existingDoc.id, action: 'updated' as const };
    }

    const newDoc = await productsCol.add({
      ...mappedData,
      createdAt: Timestamp.now(),
    });

    console.log('[StoreLink Pro][upsertProduct] created product', {
      productId: newDoc.id,
    });

    return { id: newDoc.id, action: 'created' as const };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const stack = error instanceof Error ? error.stack : undefined;

    console.error('[StoreLink Pro][upsertProduct] error', {
      storeId,
      product: {
        id: v9Product?.id || null,
        sku: v9Product?.sku || null,
        barcode: v9Product?.barcode || null,
        name: v9Product?.name || null,
      },
      message,
      stack,
    });

    throw new Error(message);
  }
}
