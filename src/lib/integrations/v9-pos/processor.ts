import { adminDb } from '@/lib/firebase-admin';
import admin from 'firebase-admin';

export async function processSyncEvent(eventId: string) {
  const eventRef = adminDb.collection('integration_events').doc(eventId);
  
  return await adminDb.runTransaction(async (transaction) => {
    const eventSnap = await transaction.get(eventRef);

    if (!eventSnap.exists) {
      throw new Error(`Event ${eventId} not found`);
    }

    const eventData = eventSnap.data()!;
    if (eventData.status === 'success' || eventData.status === 'processing') {
      return { success: true, message: 'Already processed or processing' };
    }

    transaction.update(eventRef, { 
      status: 'processing',
      processed_at: admin.firestore.FieldValue.serverTimestamp()
    });

    try {
      const { event_type, payload, store_id } = eventData;
      const occurredAt = payload.occurred_at ? new Date(payload.occurred_at) : new Date();
      
      if (event_type === 'connection.test') {
        // Handshake
      } else if (event_type === 'product.updated' || event_type === 'product.create' || event_type === 'product.stock.updated' || event_type === 'product.price.updated' || event_type === 'product.created') {
        await upsertProduct(transaction, store_id, payload.product, occurredAt);
      } else if (event_type === 'product.deleted') {
        await deleteProduct(transaction, store_id, payload.product.id, occurredAt);
      } else if (event_type === 'product.bulk_sync') {
        const products = payload.products || [];
        for (const product of products) {
          await upsertProduct(transaction, store_id, product, occurredAt);
        }
      }

      transaction.update(eventRef, { 
        status: 'success',
        processed_at: admin.firestore.FieldValue.serverTimestamp()
      });

      const processedRef = adminDb.collection('processed_sync_events').doc(eventId);
      transaction.set(processedRef, {
        event_id: eventId,
        source: eventData.source,
        store_id: store_id,
        processed_at: admin.firestore.FieldValue.serverTimestamp()
      });

      return { success: true };
    } catch (error) {
      transaction.update(eventRef, { 
        status: 'failed',
        error_message: String(error),
        retry_count: admin.firestore.FieldValue.increment(1)
      });
      throw error;
    }
  });
}

async function upsertProduct(transaction: admin.firestore.Transaction, storeId: string, v9Product: any, occurredAt: Date) {
  const v9ProductId = v9Product.id;
  const mapRef = adminDb.collection('product_sync_map').doc(`${storeId}_${v9ProductId}`);
  const mapSnap = await transaction.get(mapRef);
  
  if (mapSnap.exists) {
    const lastOccurredAt = mapSnap.data()?.last_occurred_at?.toDate();
    if (lastOccurredAt && occurredAt < lastOccurredAt) {
      return;
    }
  }

  let storelinkProductId: string | null = null;
  
  if (mapSnap.exists) {
    storelinkProductId = mapSnap.data()!.storelink_product_id;
  } else {
    if (v9Product.barcode) {
      const barcodeQuery = adminDb.collection('products')
        .where('store_id', '==', storeId)
        .where('barcode', '==', v9Product.barcode)
        .limit(1);
      const barcodeSnap = await transaction.get(barcodeQuery);
      if (!barcodeSnap.empty) storelinkProductId = barcodeSnap.docs[0].id;
    }
    
    if (!storelinkProductId && v9Product.sku) {
      const skuQuery = adminDb.collection('products')
        .where('store_id', '==', storeId)
        .where('sku', '==', v9Product.sku)
        .limit(1);
      const skuSnap = await transaction.get(skuQuery);
      if (!skuSnap.empty) storelinkProductId = skuSnap.docs[0].id;
    }
  }

  const productData: any = {
    name: v9Product.name,
    name_lowercase: (v9Product.name || '').toLowerCase(),
    sellingPrice: v9Product.selling_price,
    purchasePrice: v9Product.cost_price,
    stock: v9Product.stock_quantity,
    sku: v9Product.sku || null,
    barcode: v9Product.barcode || null,
    lowStockThreshold: v9Product.reorder_level || 10,
    imageUrl: v9Product.image_url || null,
    isVisibleInPOS: v9Product.status === 'active',
    isVisibleOnWeb: true,
    store_id: storeId,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    integration: {
        source: 'v9-pos',
        sourceProductId: v9ProductId,
        syncedAt: admin.firestore.FieldValue.serverTimestamp()
    }
  };

  if (storelinkProductId) {
    const productRef = adminDb.collection('products').doc(storelinkProductId);
    transaction.update(productRef, productData);
  } else {
    productData.createdAt = admin.firestore.FieldValue.serverTimestamp();
    const newProductRef = adminDb.collection('products').doc();
    transaction.set(newProductRef, productData);
    storelinkProductId = newProductRef.id;
  }

  transaction.set(mapRef, {
    store_id: storeId,
    v9_product_id: v9ProductId,
    storelink_product_id: storelinkProductId,
    sku: v9Product.sku || null,
    barcode: v9Product.barcode || null,
    last_synced_at: admin.firestore.FieldValue.serverTimestamp(),
    last_occurred_at: occurredAt,
    sync_status: 'success'
  }, { merge: true });
}

async function deleteProduct(transaction: admin.firestore.Transaction, storeId: string, v9ProductId: string, occurredAt: Date) {
  const mapRef = adminDb.collection('product_sync_map').doc(`${storeId}_${v9ProductId}`);
  const mapSnap = await transaction.get(mapRef);

  if (!mapSnap.exists) return;

  const lastOccurredAt = mapSnap.data()?.last_occurred_at?.toDate();
  if (lastOccurredAt && occurredAt < lastOccurredAt) return;

  const storelinkProductId = mapSnap.data()!.storelink_product_id;
  const productRef = adminDb.collection('products').doc(storelinkProductId);
  
  transaction.update(productRef, {
      isVisibleInPOS: false,
      isVisibleOnWeb: false,
      status: 'archived',
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
  });
  
  transaction.update(mapRef, {
      sync_status: 'deleted',
      last_occurred_at: occurredAt,
      last_synced_at: admin.firestore.FieldValue.serverTimestamp()
  });
}
