'use server'

import { adminDb } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import { sendOrderNotifications } from '@/lib/email';

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
  guestInfo,
  payCurrency,
  gateway
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
  payCurrency?: string;
  gateway?: string;
}) {
  try {
    const { orderId, orderData, settings } = await adminDb.runTransaction(async (transaction) => {
      // 0. Get store settings
      let settings = {};
      if (storeId) {
        const settingsDoc = await transaction.get(adminDb.collection('stores').doc(storeId).collection('settings').doc('config'));
        if (settingsDoc.exists) {
          settings = { id: storeId, ...settingsDoc.data() };
        } else {
            // Fallback to legacy
            const legacySettingsDoc = await transaction.get(adminDb.collection('settings').doc(storeId));
            if (legacySettingsDoc.exists) {
                settings = { id: storeId, ...legacySettingsDoc.data() };
            }
        }
      } else {
        const globalSettingsDoc = await transaction.get(adminDb.collection('settings').doc('global'));
        if (globalSettingsDoc.exists) {
          settings = { id: 'global', ...globalSettingsDoc.data() };
        }
      }

      // 1. Check stock for all items and get names
      const productRefs = items.map(item => adminDb.collection('products').doc(item.productId));
      const productSnaps = await Promise.all(productRefs.map(ref => transaction.get(ref)));

      const enrichedItems = [];

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
        
        enrichedItems.push({
          ...item,
          productName: data?.name || 'Product'
        });
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
        items: enrichedItems,
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
        paymentStatus: 'UNPAID',
        isPaid: false,
        createdAt: FieldValue.serverTimestamp(),
        guestInfo: guestInfo || null,
        payCurrency: payCurrency || null,
        gateway: gateway || null,
      };
      
      transaction.set(orderRef, orderData);

      return { orderId: orderRef.id, orderData, settings };
    });

    // Send Email Notifications (non-blocking)
    if (orderId && orderData) {
        // We use a separate async call to not block the response
        sendOrderNotifications(
            { id: orderId, ...orderData }, 
            settings, 
            (settings as any).storeName || 'Our Store'
        ).catch(err => console.error('Error sending order emails:', err));
    }

    return { success: true, orderId };
  } catch (error: any) {
    console.error('Error placing order:', error);
    return { success: false, error: error.message };
  }
}

export async function sendOrderEmailsAction(orderId: string, storeId: string) {
    try {
        const orderDoc = await adminDb.collection('orders').doc(orderId).get();
        if (!orderDoc.exists) throw new Error('Order not found');
        
        const orderData = orderDoc.data();
        
        let settings = {};
        if (storeId && storeId !== 'global') {
            const settingsDoc = await adminDb.collection('stores').doc(storeId).collection('settings').doc('config').get();
            if (settingsDoc.exists) {
                settings = { id: storeId, ...settingsDoc.data() };
            } else {
                const legacySettingsDoc = await adminDb.collection('settings').doc(storeId).get();
                if (legacySettingsDoc.exists) {
                    settings = { id: storeId, ...legacySettingsDoc.data() };
                }
            }
        } else {
            const globalSettingsDoc = await adminDb.collection('settings').doc('global').get();
            if (globalSettingsDoc.exists) {
                settings = { id: 'global', ...globalSettingsDoc.data() };
            }
        }
        
        await sendOrderNotifications(
            { id: orderId, ...orderData }, 
            settings, 
            (settings as any).storeName || 'Our Store'
        );
        
        return { success: true };
    } catch (error: any) {
        console.error('Error in sendOrderEmailsAction:', error);
        return { success: false, error: error.message };
    }
}

export async function sendTestOrderEmailAction(emails: string[], storeId: string, currency: string = '$') {
    try {
        let storeName = 'Test Store';
        if (storeId && storeId !== 'global') {
            const storeDoc = await adminDb.collection('stores').doc(storeId).get();
            if (storeDoc.exists) {
                storeName = storeDoc.data()?.name || 'Test Store';
            }
        } else {
            const globalSettingsDoc = await adminDb.collection('settings').doc('global').get();
            if (globalSettingsDoc.exists) {
                storeName = globalSettingsDoc.data()?.storeName || 'Test Store';
            }
        }

        const dummyOrder = {
            id: 'TEST-12345',
            guestInfo: {
                name: 'Test Customer',
                email: emails[0] || 'customer@example.com',
                address: '123 Test Street, Demo City',
            },
            user_id: 'GUEST',
            totalAmount: 150.00,
            deliveryPrice: 10.00,
            paymentStatus: 'PAID',
            items: [
                { productName: 'Sample Product 1', quantity: 2, price: 50.00 },
                { productName: 'Sample Product 2', quantity: 1, price: 40.00 },
            ],
        };

        const testSettings = {
            id: storeId || 'global',
            enableEmailAlerts: true,
            orderNotificationEmails: emails,
            currency: currency,
        };

        await sendOrderNotifications(dummyOrder, testSettings, storeName);
        return { success: true };
    } catch (error: any) {
        console.error('Error in sendTestOrderEmailAction:', error);
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
