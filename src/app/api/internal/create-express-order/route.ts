import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { storeId, items, totalAmount, totalCost, email } = body;

    const orderId = await adminDb.runTransaction(async (transaction) => {
      // 0. Perform all reads first
      const itemsProductSnaps = [];
      for (const item of items) {
        const productRef = adminDb.collection('products').doc(item.productId);
        const snap = await transaction.get(productRef);
        if (!snap.exists) {
          throw new Error(`Product ${item.productId} not found`);
        }
        itemsProductSnaps.push({ item, snap, ref: productRef });
      }

      // 1. Process each item (all writes)
      for (const { item, snap, ref } of itemsProductSnaps) {
        const data = snap.data();
        let currentStock = Number(data?.stock || 0);
        const quantity = Number(item.quantity || 0);
        
        if (item.variantId && data?.hasVariants && data?.variants) {
          const variants = [...data.variants];
          const variantIndex = variants.findIndex((v: any) => v.id === item.variantId);
          if (variantIndex !== -1) {
            const variant = { ...variants[variantIndex] };
            if (variant.stock < quantity) {
              throw new Error(`Insufficient stock for variant ${variant.name}`);
            }
            variant.stock -= quantity;
            variants[variantIndex] = variant;
            transaction.update(ref, { 
              variants, 
              stock: currentStock - quantity,
              updatedAt: FieldValue.serverTimestamp()
            });

            // 1b. Log Stock Audit
            const auditRef = adminDb.collection('stockAudit').doc();
            transaction.set(auditRef, {
              productId: item.productId,
              productName: (data?.name || 'Product') + (variant ? ` (${variant.name})` : ''),
              variantId: item.variantId || null,
              selectedOptions: item.selectedOptions || null,
              store_id: storeId,
              type: 'SALE',
              referenceId: 'EXPRESS-ORDER',
              beforeStock: currentStock,
              afterStock: currentStock - quantity,
              change: -quantity,
              staffId: 'system',
              staffName: 'Express Checkout',
              timestamp: FieldValue.serverTimestamp()
            });
          } else {
            transaction.update(ref, { 
              stock: currentStock - quantity,
              updatedAt: FieldValue.serverTimestamp()
            });

            const auditRef = adminDb.collection('stockAudit').doc();
            transaction.set(auditRef, {
              productId: item.productId,
              productName: data?.name || 'Product',
              store_id: storeId,
              type: 'SALE',
              referenceId: 'EXPRESS-ORDER',
              beforeStock: currentStock,
              afterStock: currentStock - quantity,
              change: -quantity,
              staffId: 'system',
              staffName: 'Express Checkout',
              timestamp: FieldValue.serverTimestamp()
            });
          }
        } else {
          if (currentStock < quantity) {
            throw new Error(`Insufficient stock for ${data?.name || 'Product'}`);
          }
          transaction.update(ref, { 
            stock: currentStock - quantity,
            updatedAt: FieldValue.serverTimestamp()
          });

          const auditRef = adminDb.collection('stockAudit').doc();
          transaction.set(auditRef, {
            productId: item.productId,
            productName: data?.name || 'Product',
            store_id: storeId,
            type: 'SALE',
            referenceId: 'EXPRESS-ORDER',
            beforeStock: currentStock,
            afterStock: currentStock - quantity,
            change: -quantity,
            staffId: 'system',
            staffName: 'Express Checkout',
            timestamp: FieldValue.serverTimestamp()
          });
        }
      }

      // 2. Create the order
      const orderRef = adminDb.collection('orders').doc();
      const enrichedItems = itemsProductSnaps.map(({ item, snap }) => {
        const data = snap.data();
        return {
          ...item,
          productName: data?.name || 'Product'
        };
      });

      transaction.set(orderRef, {
        store_id: storeId,
        items: enrichedItems,
        totalAmount,
        totalCost,
        status: 'pending',
        isPaid: false,
        paymentMethod: 'Express Checkout',
        createdAt: FieldValue.serverTimestamp(),
        guestInfo: email ? { email, name: 'Guest', address: 'Collected at checkout' } : null
      });
      
      return orderRef.id;
    });

    return NextResponse.json({ success: true, orderId });
  } catch (error: any) {
    console.error('Express order error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
