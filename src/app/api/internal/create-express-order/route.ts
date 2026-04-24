import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { storeId, items, totalAmount, totalCost, email } = body;

    const orderId = await adminDb.runTransaction(async (transaction) => {
      // 1. Check stock and deduct
      for (const item of items) {
        const productRef = adminDb.collection('products').doc(item.productId);
        const productSnap = await transaction.get(productRef);
        
        if (!productSnap.exists) {
          throw new Error(`Product ${item.productId} not found`);
        }
        
        const data = productSnap.data();
        let currentStock = data?.stock || 0;
        
        if (item.variantId && data?.hasVariants && data?.variants) {
          const variants = [...data.variants];
          const variantIndex = variants.findIndex((v: any) => v.id === item.variantId);
          if (variantIndex !== -1) {
            const variant = { ...variants[variantIndex] };
            if (variant.stock < item.quantity) {
              throw new Error(`Insufficient stock for variant ${variant.name}`);
            }
            variant.stock -= item.quantity;
            variants[variantIndex] = variant;
            transaction.update(productRef, { 
              variants, 
              stock: currentStock - item.quantity,
              updatedAt: FieldValue.serverTimestamp()
            });

            // 1b. Log Stock Audit
            const auditRef = adminDb.collection('stockAudit').doc();
            transaction.set(auditRef, {
              productId: item.productId,
              productName: data?.name + (variant ? ` (${variant.name})` : ''),
              variantId: item.variantId || null,
              selectedOptions: item.selectedOptions || null,
              store_id: storeId,
              type: 'SALE',
              referenceId: 'EXPRESS-PENDING', // Will be updated or identified as express
              beforeStock: currentStock,
              afterStock: currentStock - item.quantity,
              change: -item.quantity,
              staffId: 'system',
              staffName: 'Express Checkout',
              timestamp: FieldValue.serverTimestamp()
            });
          } else {
            transaction.update(productRef, { 
              stock: currentStock - item.quantity,
              updatedAt: FieldValue.serverTimestamp()
            });

            const auditRef = adminDb.collection('stockAudit').doc();
            transaction.set(auditRef, {
              productId: item.productId,
              productName: data?.name,
              store_id: storeId,
              type: 'SALE',
              referenceId: 'EXPRESS-PENDING',
              beforeStock: currentStock,
              afterStock: currentStock - item.quantity,
              change: -item.quantity,
              staffId: 'system',
              staffName: 'Express Checkout',
              timestamp: FieldValue.serverTimestamp()
            });
          }
        } else {
          if (currentStock < item.quantity) {
            throw new Error(`Insufficient stock for ${data?.name}`);
          }
          transaction.update(productRef, { 
            stock: currentStock - item.quantity,
            updatedAt: FieldValue.serverTimestamp()
          });

          const auditRef = adminDb.collection('stockAudit').doc();
          transaction.set(auditRef, {
            productId: item.productId,
            productName: data?.name,
            store_id: storeId,
            type: 'SALE',
            referenceId: 'EXPRESS-PENDING',
            beforeStock: currentStock,
            afterStock: currentStock - item.quantity,
            change: -item.quantity,
            staffId: 'system',
            staffName: 'Express Checkout',
            timestamp: FieldValue.serverTimestamp()
          });
        }
      }

      // 2. Create the order
      const orderRef = adminDb.collection('orders').doc();
      transaction.set(orderRef, {
        store_id: storeId,
        items,
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
