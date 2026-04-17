'use server'

import { adminDb } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';

export async function placeOrderAction({
  userId,
  storeId,
  items,
  totalAmount,
  totalCost,
  paymentMethod,
  paymentReference,
  paymentReceiptUrl,
  couponCode,
  appliedCouponId,
  selectedBankAccount,
  fulfillmentType,
  deliveryLocationId,
  deliveryPrice,
  guestInfo
}: {
  userId: string;
  storeId: string | null;
  items: { productId: string; quantity: number; price: number }[];
  totalAmount: number;
  totalCost: number;
  paymentMethod: string;
  paymentReference?: string | null;
  paymentReceiptUrl?: string | null;
  couponCode?: string | null;
  appliedCouponId?: string | null;
  selectedBankAccount?: any;
  fulfillmentType?: string;
  deliveryLocationId?: string | null;
  deliveryPrice?: number;
  guestInfo?: any;
}) {
  try {
    const result = await adminDb.runTransaction(async (transaction) => {
      // 1. Check stock for all items
      const productRefs = items.map(item => adminDb.collection('products').doc(item.productId));
      const productSnaps = await Promise.all(productRefs.map(ref => transaction.get(ref)));

      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        const snap = productSnaps[i];
        if (!snap.exists) throw new Error(`Product with ID "${item.productId}" not found.`);
        
        const data = snap.data();
        const currentStock = data?.stock || 0;
        if (currentStock < item.quantity) {
          throw new Error(`Insufficient stock for "${data?.name || item.productId}". Only ${currentStock} left.`);
        }
        
        transaction.update(productRefs[i], { stock: currentStock - item.quantity });
      }

      // 2. Update coupon if applicable
      if (appliedCouponId) {
        const couponRef = adminDb.collection('coupons').doc(appliedCouponId);
        transaction.update(couponRef, { usageCount: FieldValue.increment(1) });
      }

      // 3. Create the order
      const orderRef = adminDb.collection('orders').doc();
      const orderData = {
        user_id: userId,
        store_id: storeId,
        items,
        totalAmount,
        totalCost,
        paymentMethod,
        paymentReference: paymentReference || null,
        paymentReceiptUrl: paymentReceiptUrl || null,
        couponCode: couponCode || null,
        selectedBankAccount: selectedBankAccount || null,
        fulfillmentType: fulfillmentType || 'delivery',
        deliveryLocationId: deliveryLocationId || null,
        deliveryPrice: deliveryPrice || 0,
        status: 'pending',
        isPaid: false,
        createdAt: FieldValue.serverTimestamp(),
        guestInfo: guestInfo || null,
      };
      
      transaction.set(orderRef, orderData);

      return { orderId: orderRef.id };
    });

    return { success: true, orderId: result.orderId };
  } catch (error: any) {
    console.error('Error placing order:', error);
    return { success: false, error: error.message };
  }
}

export async function logWhatsAppMessageAction(logData: any) {
  try {
    await adminDb.collection('whatsappMessageLogs').add({
      ...logData,
      timestamp: FieldValue.serverTimestamp(),
    });
    return { success: true };
  } catch (error: any) {
    console.error('Error logging WhatsApp message:', error);
    return { success: false, error: error.message };
  }
}
