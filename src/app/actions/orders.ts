'use server'

import { adminDb } from '@/lib/firebase-admin';
import * as admin from 'firebase-admin';
import { sendOrderNotifications } from '@/lib/email';
import { WhatsAppAlertSettings, OrderStatus } from '@/lib/types';
import { 
    sendWhatsAppViaEBulkSMS, 
    logWhatsAppMessage, 
    getWhatsAppSettings 
} from '@/lib/whatsapp-ebulk';
import { encrypt } from '@/lib/encryption';

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
  gateway,
  taxRate,
  taxAmountCalculated
}: {
  userId: string;
  storeId: string | null;
  items: { 
    productId: string; 
    quantity: number; 
    price: number; 
    variantId?: string; 
    selectedOptions?: any;
  }[];
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
  taxRate?: number;
  taxAmountCalculated?: number;
}) {
  try {
    // Basic validation
    if (!items || !Array.isArray(items) || items.length === 0) {
      return { success: false, error: 'Cannot place an empty order.' };
    }

    if (totalAmount < 0) {
      return { success: false, error: 'Invalid total amount.' };
    }

    let resultOrderId = '';
    let orderDataForNotification: any = null;
    let settingsForNotification: any = null;
    let emailAlertSettingsForNotification: any = null;
    let whatsappAlertSettingsForNotification: any = null;

    await adminDb.runTransaction(async (transaction) => {
      // 0. Baseline settings from global
      let settings: any = { id: 'global' };
      let emailAlertSettings: any = null;
      let whatsappAlertSettings: any = null;

      const globalSettingsDoc = await transaction.get(adminDb.collection('settings').doc('global'));
      if (globalSettingsDoc.exists) {
        settings = { ...settings, ...globalSettingsDoc.data() };
      }
      
      const globalEmailAlertsDoc = await transaction.get(adminDb.collection('settings').doc('emailAlerts'));
      if (globalEmailAlertsDoc.exists) {
        emailAlertSettings = globalEmailAlertsDoc.data();
      }

      const globalWhatsAppAlertsDoc = await transaction.get(adminDb.collection('settings').doc('whatsappAlerts'));
      if (globalWhatsAppAlertsDoc.exists) {
        whatsappAlertSettings = globalWhatsAppAlertsDoc.data();
      }

      if (storeId) {
        const settingsDoc = await transaction.get(adminDb.collection('stores').doc(storeId).collection('settings').doc('config'));
        if (settingsDoc.exists) {
          settings = { ...settings, id: storeId, ...settingsDoc.data() };
        } else {
            // Fallback to legacy
            const legacySettingsDoc = await transaction.get(adminDb.collection('settings').doc(storeId));
            if (legacySettingsDoc.exists) {
                settings = { ...settings, id: storeId, ...legacySettingsDoc.data() };
            }
        }

        // Fetch store-specific email alert settings
        const emailAlertsDoc = await transaction.get(adminDb.collection('stores').doc(storeId).collection('settings').doc('emailAlerts'));
        if (emailAlertsDoc.exists) {
            emailAlertSettings = { ...emailAlertSettings, ...emailAlertsDoc.data() };
        }

        // Fetch store-specific whatsapp alert settings
        const whatsappAlertsDoc = await transaction.get(adminDb.collection('stores').doc(storeId).collection('settings').doc('whatsappAlerts'));
        if (whatsappAlertsDoc.exists) {
            whatsappAlertSettings = { ...whatsappAlertSettings, ...whatsappAlertsDoc.data() };
        }
      }

      // 1. Check stock for all items and get names
      const enrichedItems = [];
      
      // Perform all reads first
      const productSnaps = [];
      for (const item of items) {
        const productRef = adminDb.collection('products').doc(item.productId);
        const snap = await transaction.get(productRef);
        if (!snap.exists) throw new Error(`Product with ID "${item.productId}" not found.`);
        productSnaps.push({ item, snap, ref: productRef });
      }

      // Now perform all writes
      for (const { item, snap, ref } of productSnaps) {
        const data = snap.data() as any;
        let currentStock = Number(data?.stock || 0);
        const quantity = Number(item.quantity || 0);

        if (item.variantId && data?.hasVariants && data?.variants) {
          const variants = [...data.variants];
          const variantIndex = variants.findIndex(v => v.id === item.variantId);
          if (variantIndex !== -1) {
             const variant = { ...variants[variantIndex] };
             if (variant.stock < quantity) {
               throw new Error(`Insufficient stock for "${data?.name} (${variant.name})". Only ${variant.stock} left.`);
             }
             variant.stock -= quantity;
             variants[variantIndex] = variant;
             // Also update main product stock (total sum)
             currentStock -= quantity;
             transaction.update(ref, { variants, stock: currentStock });

             // Log Stock Audit
             const auditRef = adminDb.collection('stockAudit').doc();
             transaction.set(auditRef, {
                productId: item.productId,
                productName: (data?.name || 'Product') + ` (${variant.name})`,
                variantId: item.variantId,
                selectedOptions: item.selectedOptions || null,
                store_id: storeId,
                type: 'SALE',
                referenceId: 'ONLINE-ORDER',
                beforeStock: currentStock + quantity,
                afterStock: currentStock,
                change: -quantity,
                staffId: userId || 'customer',
                staffName: 'Online Customer',
                timestamp: admin.firestore.FieldValue.serverTimestamp()
             });
             } else {
             if (currentStock < quantity) {
               throw new Error(`Insufficient stock for "${data?.name}". Only ${currentStock} left.`);
             }
             transaction.update(ref, { stock: currentStock - quantity });

             const auditRef = adminDb.collection('stockAudit').doc();
             transaction.set(auditRef, {
                productId: item.productId,
                productName: data?.name || 'Product',
                store_id: storeId,
                type: 'SALE',
                referenceId: 'ONLINE-ORDER',
                beforeStock: currentStock,
                afterStock: currentStock - quantity,
                change: -quantity,
                staffId: userId || 'customer',
                staffName: 'Online Customer',
                timestamp: admin.firestore.FieldValue.serverTimestamp()
             });
             }
             } else {
             if (currentStock < quantity) {
             throw new Error(`Insufficient stock for "${data?.name || item.productId}". Only ${currentStock} left.`);
             }
             transaction.update(ref, { stock: currentStock - quantity });

             const auditRef = adminDb.collection('stockAudit').doc();
             transaction.set(auditRef, {
             productId: item.productId,
             productName: data?.name || 'Product',
             store_id: storeId,
             type: 'SALE',
             referenceId: 'ONLINE-ORDER',
             beforeStock: currentStock,
             afterStock: currentStock - quantity,
             change: -quantity,
             staffId: userId || 'customer',
             staffName: 'Online Customer',
             timestamp: admin.firestore.FieldValue.serverTimestamp()
             });
             }

        enrichedItems.push({
          ...item,
          productName: data?.name || 'Product'
        });
      }

      // 2. Update coupon if applicable
      if (appliedCouponId) {
        const couponRef = adminDb.collection('coupons').doc(appliedCouponId);
        transaction.update(couponRef, { usageCount: admin.firestore.FieldValue.increment(1) });
      }

      // 3. Create the order
      const orderRef = adminDb.collection('orders').doc();
      
      // Ensure all numbers are valid
      const finalTotalAmount = Number(totalAmount) || 0;
      const finalTotalCost = Number(totalCost) || 0;
      const finalDeliveryPrice = Number(deliveryPrice) || 0;
      const finalTaxRate = Number(taxRate) || 0;
      const finalTaxAmountCalculated = Number(taxAmountCalculated) || 0;

      const orderData = {
        user_id: userId,
        store_id: storeId,
        storeName: (settings as any).storeName || 'Our Store',
        items: enrichedItems,
        totalAmount: finalTotalAmount,
        totalCost: finalTotalCost,
        paymentMethod,
        paymentReference: paymentReference || null,
        paymentReceiptUrl: paymentReceiptUrl || null,
        couponCode: couponCode || null,
        selectedBankAccount: selectedBankAccount || null,
        fulfillmentType: fulfillmentType || 'delivery',
        deliveryLocationId: deliveryLocationId || null,
        deliveryPrice: finalDeliveryPrice,
        status: 'pending',
        isRead: false,
        paymentStatus: 'UNPAID',
        isPaid: false,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        guestInfo: guestInfo || null,
        payCurrency: payCurrency || null,
        gateway: gateway || null,
        taxRate: finalTaxRate,
        taxAmountCalculated: finalTaxAmountCalculated,
      };
      
      transaction.set(orderRef, orderData);

      // 3.5 Create a corresponding sale transaction to track online order as a sale
      const saleRef = adminDb.collection('saleTransactions').doc();
      const saleData = {
        orderId: orderRef.id, // Link to the order
        store_id: storeId,
        staffId: userId || 'customer',
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        grandTotal: finalTotalAmount,
        subtotal: finalTotalAmount - finalTaxAmountCalculated,
        items: enrichedItems.map(item => ({
            productId: item.productId,
            productName: item.productName,
            quantity: item.quantity,
            unitPrice: item.price,
            totalPrice: item.price * item.quantity,
            variantId: item.variantId || null,
            selectedOptions: item.selectedOptions || null
        })),
        paymentMethod: paymentMethod,
        isPaid: false,
        customerName: guestInfo?.name || 'Online Customer',
        discountAmountCalculated: 0, 
        taxRate: finalTaxRate,
        taxAmountCalculated: finalTaxAmountCalculated,
        reprintCount: 0
      };
      transaction.set(saleRef, saleData);

      // Prepare data for non-blocking notifications
      resultOrderId = orderRef.id;
      orderDataForNotification = { 
        ...orderData, 
        id: resultOrderId,
        createdAt: new Date() // Use current date for notifications instead of FieldValue
      };
      settingsForNotification = settings;
      emailAlertSettingsForNotification = emailAlertSettings;
      whatsappAlertSettingsForNotification = whatsappAlertSettings;
    });

    // Send Email Notifications (non-blocking)
    if (resultOrderId && orderDataForNotification) {
        sendOrderNotifications(
            orderDataForNotification, 
            settingsForNotification, 
            (settingsForNotification as any).storeName || 'Our Store',
            emailAlertSettingsForNotification
        ).catch(err => console.error('Error sending order emails:', err));

        // Send WhatsApp Notifications (non-blocking)
        const waSettings: any = {
            enabled: (settingsForNotification as any).enableOrderAlerts || (settingsForNotification as any).enableWhatsapp || whatsappAlertSettingsForNotification?.enabled,
            username: whatsappAlertSettingsForNotification?.username || (settingsForNotification as any).eBulkUsername,
            apiKey: whatsappAlertSettingsForNotification?.apiKey || (settingsForNotification as any).eBulkApiKey,
            senderNumber: whatsappAlertSettingsForNotification?.senderNumber || (settingsForNotification as any).orderNotificationNumbers?.[0],
            orderNotificationNumbers: Array.from(new Set([
                ...(Array.isArray(whatsappAlertSettingsForNotification?.orderNotificationNumbers) ? whatsappAlertSettingsForNotification.orderNotificationNumbers : []),
                ...(Array.isArray((settingsForNotification as any).orderNotificationNumbers) ? (settingsForNotification as any).orderNotificationNumbers : [])
            ])),
            orderPlacedTemplate: whatsappAlertSettingsForNotification?.orderPlacedTemplate,
        };

        if (waSettings.enabled && waSettings.username && waSettings.apiKey) {
            sendWhatsAppOrderAlert(
                orderDataForNotification,
                waSettings as WhatsAppAlertSettings,
                (settingsForNotification as any).currency || '₦'
            ).catch(err => console.error('Error sending WhatsApp alert:', err));
        }
    }

    return { success: true, orderId: resultOrderId };
  } catch (error: any) {
    console.error('Error placing order:', error);
    return { success: false, error: error.message || 'An unknown error occurred during order placement' };
  }
}

export async function updateOrderStatusAction(orderId: string, storeId: string, newStatus: OrderStatus, staffId: string, staffName: string, staffEmail: string) {
    try {
        const orderRef = adminDb.collection('orders').doc(orderId);

        let orderDataForWhatsApp: any = null;

        await adminDb.runTransaction(async (transaction) => {
            const orderSnap = await transaction.get(orderRef);
            if (!orderSnap.exists) throw new Error('Order not found');

            const orderData = orderSnap.data() as any;
            const oldStatus = orderData?.status;

            if (oldStatus === newStatus) return;

            transaction.update(orderRef, {
                status: newStatus,
                isRead: true,
                updatedAt: admin.firestore.FieldValue.serverTimestamp()
            });

            // Handle Cancellation: Return Stock and Void Sale
            if (newStatus === 'cancelled' && oldStatus !== 'cancelled') {
                // 1. Return Stock
                if (orderData.items && Array.isArray(orderData.items)) {
                    for (const item of orderData.items) {
                        const productRef = adminDb.collection('products').doc(item.productId);
                        const productSnap = await transaction.get(productRef);
                        if (productSnap.exists) {
                            const productData = productSnap.data() as any;
                            let currentTotalStock = Number(productData.stock || 0);
                            const quantityToReturn = Number(item.quantity || 0);

                            if (item.variantId && productData.hasVariants && productData.variants) {
                                const variants = [...productData.variants];
                                const variantIndex = variants.findIndex((v: any) => v.id === item.variantId);
                                if (variantIndex !== -1) {
                                    const variant = { ...variants[variantIndex] };
                                    variant.stock = (Number(variant.stock) || 0) + quantityToReturn;
                                    variants[variantIndex] = variant;
                                    currentTotalStock += quantityToReturn;
                                    transaction.update(productRef, { variants, stock: currentTotalStock });

                                    // Log Stock Audit
                                    const auditRef = adminDb.collection('stockAudit').doc();
                                    transaction.set(auditRef, {
                                        productId: item.productId,
                                        productName: (productData.name || 'Product') + ` (${variant.name})`,
                                        variantId: item.variantId,
                                        selectedOptions: item.selectedOptions || null,
                                        store_id: storeId,
                                        type: 'RETURN',
                                        referenceId: `CANCELLED-ORDER-${orderId}`,
                                        beforeStock: currentTotalStock - quantityToReturn,
                                        afterStock: currentTotalStock,
                                        change: quantityToReturn,
                                        staffId: staffId,
                                        staffName: staffName,
                                        timestamp: admin.firestore.FieldValue.serverTimestamp()
                                    });
                                } else {
                                    // Fallback if variant not found
                                    currentTotalStock += quantityToReturn;
                                    transaction.update(productRef, { stock: currentTotalStock });
                                }
                            } else {
                                currentTotalStock += quantityToReturn;
                                transaction.update(productRef, { stock: currentTotalStock });

                                // Log Stock Audit
                                const auditRef = adminDb.collection('stockAudit').doc();
                                transaction.set(auditRef, {
                                    productId: item.productId,
                                    productName: productData.name || 'Product',
                                    store_id: storeId,
                                    type: 'RETURN',
                                    referenceId: `CANCELLED-ORDER-${orderId}`,
                                    beforeStock: currentTotalStock - quantityToReturn,
                                    afterStock: currentTotalStock,
                                    change: quantityToReturn,
                                    staffId: staffId,
                                    staffName: staffName,
                                    timestamp: admin.firestore.FieldValue.serverTimestamp()
                                });
                            }
                        }
                    }
                }

                // 2. Void Sale Transaction
                const salesQuery = adminDb.collection('saleTransactions').where('orderId', '==', orderId).limit(1);
                const salesSnapshot = await transaction.get(salesQuery);
                if (!salesSnapshot.empty) {
                    const saleDoc = salesSnapshot.docs[0];
                    const saleData = saleDoc.data();

                    transaction.update(saleDoc.ref, {
                        returnedAmount: saleData.grandTotal || 0,
                        returnStatus: 'fullyReturned',
                        returns: [{
                            returnedAt: admin.firestore.FieldValue.serverTimestamp(),
                            staffId: staffId,
                            staffEmail: staffEmail,
                            reason: 'Order Cancelled',
                            items: saleData.items || [],
                            totalReturnedAmount: saleData.grandTotal || 0
                        }],
                        updatedAt: admin.firestore.FieldValue.serverTimestamp()
                    });
                }

                // 3. Update customer totalSpent if paid
                if (orderData.user_id && orderData.user_id !== 'GUEST' && orderData.isPaid) {
                    const customerQuery = adminDb.collection('customers')
                        .where('uid', '==', orderData.user_id)
                        .where('store_id', '==', storeId)
                        .limit(1);
                    const customerSnap = await transaction.get(customerQuery);
                    if (!customerSnap.empty) {
                        transaction.update(customerSnap.docs[0].ref, {
                            totalSpent: admin.firestore.FieldValue.increment(-(orderData.totalAmount || 0)),
                            updatedAt: admin.firestore.FieldValue.serverTimestamp()
                        });
                    }
                }
            }

            // Create Audit Log
            const auditLogRef = adminDb.collection('orderAudit').doc();
            transaction.set(auditLogRef, {
                orderId,
                oldStatus,
                newStatus,
                timestamp: admin.firestore.FieldValue.serverTimestamp(),
                staffId,
                staffName,
                staffEmail,
                store_id: storeId
            });

            orderDataForWhatsApp = orderData;
        });

        // Fetch settings for notifications
        const whatsappAlertSettings = await getWhatsAppSettings(storeId);

        // Send WhatsApp Notification if status changed to important states
        if (whatsappAlertSettings && whatsappAlertSettings.enabled) {
            let message = '';
            const customerName = orderDataForWhatsApp?.guestInfo?.name || 'Customer';
            const shortOrderId = orderId.substring(0, 8).toUpperCase();
            const amount = orderDataForWhatsApp?.totalAmount?.toLocaleString() || '0';

            // Get currency
            const globalSettingsDoc = await adminDb.collection('settings').doc('global').get();
            const currency = globalSettingsDoc.data()?.currency || '₦';

            const templateData = {
                orderId: shortOrderId,
                customerName,
                amount,
                currency,
                status: newStatus,
                paymentMethod: orderDataForWhatsApp?.paymentMethod || 'N/A',
                storeName: orderDataForWhatsApp?.storeName || 'Admin'
            };
            
            if (newStatus === 'processing') {
                message = whatsappAlertSettings.orderProcessingTemplate 
                    ? formatWhatsAppMessage(whatsappAlertSettings.orderProcessingTemplate, templateData)
                    : `*Hello ${orderDataForWhatsApp?.storeName || 'Admin'},*\n*Order #${shortOrderId} for ${customerName} is now being processed.*`;
            } else if (newStatus === 'shipped') {
                message = whatsappAlertSettings.orderShippedTemplate
                    ? formatWhatsAppMessage(whatsappAlertSettings.orderShippedTemplate, templateData)
                    : `*Hello ${orderDataForWhatsApp?.storeName || 'Admin'},*\n*Order #${shortOrderId} for ${customerName} has been shipped.*`;
            } else if (newStatus === 'cancelled') {
                message = whatsappAlertSettings.orderCancelledTemplate
                    ? formatWhatsAppMessage(whatsappAlertSettings.orderCancelledTemplate, templateData)
                    : `*Hello ${orderDataForWhatsApp?.storeName || 'Admin'},*\n*Order #${shortOrderId} for ${customerName} has been cancelled.*`;
            } else if (newStatus === 'delivered') {
                message = whatsappAlertSettings.orderDeliveredTemplate
                    ? formatWhatsAppMessage(whatsappAlertSettings.orderDeliveredTemplate, templateData)
                    : `*Hello ${orderDataForWhatsApp?.storeName || 'Admin'},*\n*Order #${shortOrderId} for ${customerName} has been delivered successfully.*`;
            }

            const adminRecipients: string[] = [];
            if (whatsappAlertSettings.senderNumber) adminRecipients.push(whatsappAlertSettings.senderNumber);
            if (whatsappAlertSettings.orderNotificationNumbers && Array.isArray(whatsappAlertSettings.orderNotificationNumbers)) {
                whatsappAlertSettings.orderNotificationNumbers.forEach((num: string) => {
                    if (num && !adminRecipients.includes(num)) {
                        adminRecipients.push(num);
                    }
                });
            }

            if (message && adminRecipients.length > 0) {
                (async () => {
                    const provider = whatsappAlertSettings.provider || 'ebulksms';
                    if (provider === 'whatsapi') {
                        if (whatsappAlertSettings.whatsApiGatewayUrl && whatsappAlertSettings.whatsApiApiKey && whatsappAlertSettings.whatsApiInstanceId) {
                            const { sendWhatsApiText } = await import('@/lib/whatsapp-whatsapi');
                            const results = await Promise.all(adminRecipients.map((rec: string) => sendWhatsApiText({
                                gatewayUrl: whatsappAlertSettings.whatsApiGatewayUrl,
                                apiKey: whatsappAlertSettings.whatsApiApiKey,
                                instanceId: whatsappAlertSettings.whatsApiInstanceId,
                                recipient: rec,
                                message: message,
                            })));
                            return results[0];
                        }
                    }
                    return sendWhatsAppViaEBulkSMS(
                        whatsappAlertSettings.username,
                        whatsappAlertSettings.apiKey,
                        adminRecipients,
                        `Order Status Updated: ${newStatus}`,
                        message,
                        2,
                        whatsappAlertSettings.senderNumber
                    );
                })().then(result => {
                    const status = result?.response?.status || result?.status;
                    const statusdetail = result?.response?.statusdetail || result?.statusdetail;
                    
                    // Log for each recipient
                    adminRecipients.forEach(phone => {
                        logWhatsAppMessage({
                            eventType: 'staff_order_alert',
                            messageContent: message,
                            recipientPhone: phone,
                            customerName: customerName,
                            status: status === 'SUCCESS' ? 'sent' : 'failed',
                            unitsCharged: 1,
                            userId: staffId,
                            userName: staffName,
                            storeId: storeId,
                            errorDetails: status !== 'SUCCESS' ? statusdetail : null
                        });
                    });
                }).catch(err => console.error('Error sending status WhatsApp:', err));
            }
        }

        return { success: true };
    } catch (error: any) {
        console.error('Error updating order status:', error);
        return { success: false, error: error.message };
    }
}

export async function sendOrderEmailsAction(orderId: string, storeId: string) {
    try {
        const orderDoc = await adminDb.collection('orders').doc(orderId).get();
        if (!orderDoc.exists) throw new Error('Order not found');
        
        const orderData = orderDoc.data();
        
        let settings = {};
        let emailAlertSettings = null;

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

            const emailAlertsDoc = await adminDb.collection('stores').doc(storeId).collection('settings').doc('emailAlerts').get();
            if (emailAlertsDoc.exists) {
                emailAlertSettings = emailAlertsDoc.data();
            }
        } else {
            const globalSettingsDoc = await adminDb.collection('settings').doc('global').get();
            if (globalSettingsDoc.exists) {
                settings = { id: 'global', ...globalSettingsDoc.data() };
            }

            const globalEmailAlertsDoc = await adminDb.collection('settings').doc('emailAlerts').get();
            if (globalEmailAlertsDoc.exists) {
                emailAlertSettings = globalEmailAlertsDoc.data();
            }
        }
        
        await sendOrderNotifications(
            { id: orderId, ...orderData }, 
            settings, 
            (settings as any).storeName || 'Our Store',
            emailAlertSettings
        );
        
        return { success: true };
    } catch (error: any) {
        console.error('Error in sendOrderEmailsAction:', error);
        return { success: false, error: error.message };
    }
}

export async function sendWhatsAppOrderAlertAction(orderId: string, storeId: string) {
    try {
        const orderDoc = await adminDb.collection('orders').doc(orderId).get();
        if (!orderDoc.exists) throw new Error('Order not found');
        
        const orderData = orderDoc.data();
        const settings = await getWhatsAppSettings(storeId);
        
        if (!settings || !settings.enabled) {
            throw new Error('WhatsApp alerts are disabled');
        }

        const globalSettingsDoc = await adminDb.collection('settings').doc('global').get();
        const currency = globalSettingsDoc.data()?.currency || '₦';

        await sendWhatsAppOrderAlert({ id: orderId, ...orderData }, settings as any, currency);
        
        return { success: true };
    } catch (error: any) {
        console.error('Error in sendWhatsAppOrderAlertAction:', error);
        return { success: false, error: error.message };
    }
}

export async function sendTestOrderEmailAction(emails: string[], storeId: string, currency: string = '$', emailAlertSettings?: any) {
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
            paymentMethod: 'Test Payment',
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

        await sendOrderNotifications(dummyOrder, testSettings, storeName, emailAlertSettings);
        return { success: true };
    } catch (error: any) {
        console.error('Error in sendTestOrderEmailAction:', error);
        return { success: false, error: error.message };
    }
}

export async function validateGmailSmtpAction(gmailEmail: string, gmailAppPassword: string) {
    try {
        const nodemailer = require('nodemailer');
        const transporter = nodemailer.createTransport({
            host: 'smtp.gmail.com',
            port: 465,
            secure: true,
            auth: {
                user: gmailEmail,
                pass: gmailAppPassword,
            },
        });

        await transporter.verify();
        return { success: true };
    } catch (error: any) {
        console.error('SMTP Validation Error:', error);
        return { success: false, error: error.message || 'Failed to authenticate with Gmail SMTP' };
    }
}

export async function logWhatsAppMessageAction(logData: any) {
  return logWhatsAppMessage(logData);
}

export async function saveWhatsAppAlertSettingsAction(storeId: string, settings: any) {
    try {
        const encryptedApiKey = settings.apiKey && (settings.apiKey.startsWith('iv:') || settings.apiKey.includes(':')) 
            ? settings.apiKey 
            : (settings.apiKey ? encrypt(settings.apiKey) : '');
            
        const dataToSave = {
            ...settings,
            apiKey: encryptedApiKey,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        };

        if (storeId && storeId !== 'global') {
            await adminDb.collection('stores').doc(storeId).collection('settings').doc('whatsappAlerts').set(dataToSave, { merge: true });
        } else {
            await adminDb.collection('settings').doc('whatsappAlerts').set(dataToSave, { merge: true });
        }

        return { success: true };
    } catch (error: any) {
        console.error('Error saving WhatsApp settings:', error);
        return { success: false, error: error.message };
    }
}

export async function getDecryptedWhatsAppApiKeyAction(storeId: string) {
    try {
        const settings = await getWhatsAppSettings(storeId || 'global');
        return { success: true, apiKey: settings?.apiKey || '' };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function validateEBulkSMSAction(username: string, apiKey: string) {
    try {
        const result = await sendWhatsAppViaEBulkSMS(username, apiKey, ['2348000000000'], 'Validation', 'Connection Test');
        const status = result?.response?.status || result?.status;
        const statusdetail = result?.response?.statusdetail || result?.statusdetail;
        
        if (status === 'SUCCESS' || statusdetail?.includes('INSUFFICIENT_CREDIT')) {
            return { success: true };
        }
        
        return { success: false, error: statusdetail || 'Authentication failed' };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function markAllOrdersAsDeliveredAction(storeId: string, staffId: string, staffName: string, staffEmail: string) {
    try {
        const ordersRef = adminDb.collection('orders');
        const q = ordersRef.where('store_id', '==', storeId).where('status', 'in', ['pending', 'processing', 'shipped']);
        const snapshot = await q.get();

        if (snapshot.empty) {
            return { success: true, count: 0 };
        }

        const batch = adminDb.batch();
        snapshot.docs.forEach(doc => {
            batch.update(doc.ref, { 
                status: 'delivered',
                isRead: true,
                updatedAt: admin.firestore.FieldValue.serverTimestamp() 
            });
            
            // Add audit log for each
            const auditRef = adminDb.collection('orderAudit').doc();
            batch.set(auditRef, {
                orderId: doc.id,
                oldStatus: doc.data().status,
                newStatus: 'delivered',
                timestamp: admin.firestore.FieldValue.serverTimestamp(),
                staffId,
                staffName,
                staffEmail,
                store_id: storeId,
                bulkAction: true
            });
        });

        await batch.commit();
        return { success: true, count: snapshot.size };
    } catch (error: any) {
        console.error('Error marking all orders as delivered:', error);
        return { success: false, error: error.message };
    }
}

export async function markAllOrdersAsReadAction(storeId: string) {
    try {
        const ordersRef = adminDb.collection('orders');
        const q = ordersRef.where('store_id', '==', storeId).where('isRead', '==', false);
        const snapshot = await q.get();

        // Also check for ones where isRead is missing and status is pending (legacy)
        const qLegacy = ordersRef.where('store_id', '==', storeId).where('status', '==', 'pending');
        const snapshotLegacy = await qLegacy.get();

        const batch = adminDb.batch();
        let count = 0;
        
        const handledIds = new Set();

        snapshot.docs.forEach(doc => {
            batch.update(doc.ref, { isRead: true });
            handledIds.add(doc.id);
            count++;
        });

        snapshotLegacy.docs.forEach(doc => {
            const data = doc.data();
            if (!handledIds.has(doc.id) && data.isRead !== true) {
                batch.update(doc.ref, { isRead: true });
                count++;
            }
        });

        if (count > 0) {
            await batch.commit();
        }

        return { success: true, count };
    } catch (error: any) {
        console.error('Error marking all orders as read:', error);
        return { success: false, error: error.message };
    }
}

export async function markOrderAsReadAction(orderId: string) {
    try {
        await adminDb.collection('orders').doc(orderId).update({ isRead: true });
        return { success: true };
    } catch (error: any) {
        console.error('Error marking order as read:', error);
        return { success: false, error: error.message };
    }
}

function formatWhatsAppMessage(template: string, data: { 
    orderId: string, 
    customerName: string, 
    amount: string, 
    currency: string, 
    status: string, 
    itemsDetails?: string, 
    paymentMethod?: string, 
    storeName?: string,
    fulfillmentType?: string,
    deliveryAddress?: string,
    customerEmail?: string,
    customerPhone?: string,
    paymentStatus?: string
}) {
    return template
        .replace(/{orderId}/g, data.orderId)
        .replace(/{customerName}/g, data.customerName)
        .replace(/{amount}/g, data.amount)
        .replace(/{currency}/g, data.currency)
        .replace(/{status}/g, data.status)
        .replace(/{itemsDetails}/g, data.itemsDetails || '')
        .replace(/{paymentMethod}/g, data.paymentMethod || '')
        .replace(/{storeName}/g, data.storeName || 'Admin')
        .replace(/{fulfillmentType}/g, data.fulfillmentType || '')
        .replace(/{deliveryAddress}/g, data.deliveryAddress || '')
        .replace(/{customerEmail}/g, data.customerEmail || '')
        .replace(/{customerPhone}/g, data.customerPhone || '')
        .replace(/{paymentStatus}/g, data.paymentStatus || '');
}

function formatOrderItemsForWhatsApp(items: any[], currency: string) {
    return items.map(item => {
        let name = item.productName;
        if (item.selectedOptions) {
            const options = Object.entries(item.selectedOptions).map(([k, v]) => `${v}`).join(' / ');
            name += ` [${options}]`;
        }
        return `*• ${name} x ${item.quantity} - ${currency}${item.price.toLocaleString()}*`;
    }).join('\n');
}

async function getCustomerPhone(userId: string) {
    if (!userId || userId === 'GUEST') return null;
    try {
        const doc = await adminDb.collection('users').doc(userId).get();
        const data = doc.data();
        return data?.alternativePhoneNumber || data?.phone || null;
    } catch (e) {
        return null;
    }
}

async function getCustomerName(userId: string) {
    if (!userId || userId === 'GUEST') return 'Customer';
    try {
        const doc = await adminDb.collection('users').doc(userId).get();
        return doc.data()?.displayName || doc.data()?.name || 'Customer';
    } catch (e) {
        return 'Customer';
    }
}

async function getCustomerEmail(userId: string) {
    if (!userId || userId === 'GUEST') return 'N/A';
    try {
        const doc = await adminDb.collection('users').doc(userId).get();
        return doc.data()?.email || 'N/A';
    } catch (e) {
        return 'N/A';
    }
}

export async function sendWhatsAppOrderAlert(order: any, settings: WhatsAppAlertSettings, currency: string) {
    const customerName = order.guestInfo?.name || (order.user_id !== 'GUEST' ? await getCustomerName(order.user_id) : 'Customer');
    const customerEmail = order.guestInfo?.email || (order.user_id !== 'GUEST' ? await getCustomerEmail(order.user_id) : 'N/A');
    const customerPhone = order.guestInfo?.phone || order.guestInfo?.whatsapp || (order.user_id !== 'GUEST' ? await getCustomerPhone(order.user_id) : null);
    
    const amount = order.totalAmount.toLocaleString();
    const orderId = order.id.substring(0, 8).toUpperCase();
    const itemsDetails = formatOrderItemsForWhatsApp(order.items, currency);
    const paymentMethod = order.paymentMethod || 'N/A';
    const fulfillmentType = order.fulfillmentType === 'pickup' ? 'Store Pickup' : 'Delivery';
    const deliveryAddress = order.fulfillmentType === 'pickup' ? 'N/A (Store Pickup)' : (order.guestInfo?.address || 'N/A');
    
    const productTotal = order.items.reduce((acc: number, item: any) => acc + (item.price * item.quantity), 0);
    const deliveryFee = order.deliveryPrice || 0;

    const templateData = {
        orderId,
        customerName,
        customerEmail,
        customerPhone: customerPhone || 'N/A',
        amount,
        currency,
        status: order.status,
        itemsDetails,
        paymentMethod,
        storeName: order.storeName || 'Admin',
        fulfillmentType,
        deliveryAddress,
        paymentStatus: order.paymentStatus || 'UNPAID'
    };

    // 1. Send to Admin
    const adminRecipients: string[] = [];
    if (settings.senderNumber) adminRecipients.push(settings.senderNumber);
    if (settings.orderNotificationNumbers && Array.isArray(settings.orderNotificationNumbers)) {
        settings.orderNotificationNumbers.forEach((num: string) => {
            if (num && !adminRecipients.includes(num)) {
                adminRecipients.push(num);
            }
        });
    }

    if (adminRecipients.length > 0) {
        let adminMessage = '';
        if (settings.orderPlacedTemplate) {
            adminMessage = formatWhatsAppMessage(settings.orderPlacedTemplate, templateData);
        } else {
            adminMessage = `*Hello ${order.storeName || 'Admin'},*\n*You received a new order!*\n\n` +
                           `*Order ID: #${orderId}*\n` +
                           `*Customer: ${customerName}*\n` +
                           `*Email: ${customerEmail}*\n` +
                           `*Phone: ${customerPhone || 'N/A'}*\n\n` +
                           `*Fulfillment: ${fulfillmentType}*\n` +
                           (order.fulfillmentType !== 'pickup' ? `*Address: ${deliveryAddress}*\n` : '') +
                           `*Payment: ${paymentMethod} (${order.paymentStatus || 'UNPAID'})*\n\n` +
                           `*Items:*\n${itemsDetails}\n\n` +
                           `*Product Total: ${currency}${productTotal.toLocaleString()}*\n` +
                           `*Delivery Fee: ${currency}${deliveryFee.toLocaleString()}*\n` +
                           `*GRAND TOTAL: ${currency}${order.totalAmount.toLocaleString()}*\n\n` +
                           `*Log in to dashboard to process.*`;
        }

        try {
            const result = await sendWhatsAppViaEBulkSMS(
                settings.username, 
                settings.apiKey, 
                adminRecipients, 
                'New Order Alert', 
                adminMessage,
                2,
                settings.senderNumber
            );
            const status = result?.response?.status || result?.status;
            
            // Log for each recipient
            for (const phone of adminRecipients) {
                await logWhatsAppMessage({
                    eventType: 'staff_order_alert',
                    messageContent: adminMessage,
                    recipientPhone: phone,
                    customerName: customerName,
                    status: status === 'SUCCESS' ? 'sent' : 'failed',
                    unitsCharged: 1,
                    userId: 'system',
                    userName: 'Order System',
                    storeId: order.store_id || 'global',
                    errorDetails: status !== 'SUCCESS' ? (result?.response?.statusdetail || result?.statusdetail) : null
                });
            }
        } catch (err) {
            console.error('Error sending admin WhatsApp alert:', err);
        }
    }

    // 2. Send to Customer
    if (customerPhone) {
        let extraMsg = '';
        if (order.paymentMethod === 'Bank Transfer' && order.selectedBankAccount) {
            extraMsg = `\n\n*Payment Instructions:*\n*Please transfer ${currency}${amount} to:*\n*Bank: ${order.selectedBankAccount.bankName}*\n*Account: ${order.selectedBankAccount.accountNumber}*\n*Name: ${order.selectedBankAccount.accountName}*\n*Ref: ${order.paymentReference}*\n`;
        }

        const customerMessage = `*Hello ${customerName},*\n*Your order #${orderId} at ${order.storeName || 'our store'} has been placed successfully!*\n\n` +
                               `*Order Details:*\n${itemsDetails}\n\n` +
                               `*Fulfillment: ${fulfillmentType}*\n` +
                               (order.fulfillmentType === 'pickup' ? '*Method: Store Pickup*\n' : `*Address: ${deliveryAddress}*\n`) +
                               `*Payment: ${paymentMethod}*\n` +
                               `*Status: ${order.status}*${extraMsg}\n\n` +
                               `*Summary:*\n` +
                               `*Product Total: ${currency}${productTotal.toLocaleString()}*\n` +
                               `*Delivery Fee: ${currency}${deliveryFee.toLocaleString()}*\n` +
                               `*Total Amount: ${currency}${order.totalAmount.toLocaleString()}*\n\n` +
                               `*Thank you for shopping with us!*`;

        try {
            const result = await sendWhatsAppViaEBulkSMS(
                settings.username, 
                settings.apiKey, 
                [customerPhone], 
                'Order Confirmation', 
                customerMessage,
                2,
                settings.senderNumber
            );
            const status = result?.response?.status || result?.status;
            
            await logWhatsAppMessage({
                eventType: 'order_placed',
                messageContent: customerMessage,
                recipientPhone: customerPhone,
                customerName: customerName,
                status: status === 'SUCCESS' ? 'sent' : 'failed',
                unitsCharged: 1,
                userId: 'system',
                userName: 'Order System',
                storeId: order.store_id || 'global',
                errorDetails: status !== 'SUCCESS' ? (result?.response?.statusdetail || result?.statusdetail) : null
            });
        } catch (err) {
            console.error('Error sending customer WhatsApp confirmation:', err);
        }
    }
}
