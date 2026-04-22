'use server'

import { adminDb } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
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
    const { orderId, orderData, settings, emailAlertSettings, whatsappAlertSettings } = await adminDb.runTransaction(async (transaction) => {
      // 0. Get store settings
      let settings = {};
      let emailAlertSettings = null;
      let whatsappAlertSettings = null;

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

        // Fetch store-specific email alert settings
        const emailAlertsDoc = await transaction.get(adminDb.collection('stores').doc(storeId).collection('settings').doc('emailAlerts'));
        if (emailAlertsDoc.exists) {
            emailAlertSettings = emailAlertsDoc.data();
        }

        // Fetch store-specific whatsapp alert settings
        const whatsappAlertsDoc = await transaction.get(adminDb.collection('stores').doc(storeId).collection('settings').doc('whatsappAlerts'));
        if (whatsappAlertsDoc.exists) {
            whatsappAlertSettings = whatsappAlertsDoc.data();
        }
      } else {
        const globalSettingsDoc = await transaction.get(adminDb.collection('settings').doc('global'));
        if (globalSettingsDoc.exists) {
          settings = { id: 'global', ...globalSettingsDoc.data() };
        }
        
        // Fetch global email alert settings
        const globalEmailAlertsDoc = await transaction.get(adminDb.collection('settings').doc('emailAlerts'));
        if (globalEmailAlertsDoc.exists) {
            emailAlertSettings = globalEmailAlertsDoc.data();
        }

        // Fetch global whatsapp alert settings
        const globalWhatsAppAlertsDoc = await transaction.get(adminDb.collection('settings').doc('whatsappAlerts'));
        if (globalWhatsAppAlertsDoc.exists) {
            whatsappAlertSettings = globalWhatsAppAlertsDoc.data();
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
        storeName: (settings as any).storeName || 'Our Store',
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

      return { orderId: orderRef.id, orderData, settings, emailAlertSettings, whatsappAlertSettings };
    });

    // Send Email Notifications (non-blocking)
    if (orderId && orderData) {
        sendOrderNotifications(
            { id: orderId, ...orderData }, 
            settings, 
            (settings as any).storeName || 'Our Store',
            emailAlertSettings
        ).catch(err => console.error('Error sending order emails:', err));

        // Send WhatsApp Notifications (non-blocking)
        const waSettings = whatsappAlertSettings || {
            enabled: (settings as any).enableWhatsapp,
            username: (settings as any).eBulkUsername,
            apiKey: (settings as any).eBulkApiKey,
            senderNumber: (settings as any).orderNotificationNumbers?.[0],
        };

        if (waSettings && (waSettings as any).enabled) {
            sendWhatsAppOrderAlert(
                { id: orderId, ...orderData },
                waSettings as any,
                (settings as any).currency || '₦'
            ).catch(err => console.error('Error sending WhatsApp alert:', err));
        }
    }

    return { success: true, orderId };
  } catch (error: any) {
    console.error('Error placing order:', error);
    return { success: false, error: error.message };
  }
}

export async function updateOrderStatusAction(orderId: string, storeId: string, newStatus: OrderStatus, staffId: string, staffName: string, staffEmail: string) {
    try {
        const orderRef = adminDb.collection('orders').doc(orderId);
        const orderSnap = await orderRef.get();
        if (!orderSnap.exists) throw new Error('Order not found');
        
        const orderData = orderSnap.data();
        const oldStatus = orderData?.status;
        
        await orderRef.update({ 
            status: newStatus,
            updatedAt: FieldValue.serverTimestamp()
        });

        // Create Audit Log
        await adminDb.collection('orderAudit').add({
            orderId,
            oldStatus,
            newStatus,
            timestamp: FieldValue.serverTimestamp(),
            staffId,
            staffName,
            staffEmail,
            store_id: storeId
        });

        // Fetch settings for notifications
        const whatsappAlertSettings = await getWhatsAppSettings(storeId);

        // Send WhatsApp Notification if status changed to important states
        if (whatsappAlertSettings && whatsappAlertSettings.enabled) {
            let message = '';
            const customerName = orderData?.guestInfo?.name || 'Customer';
            const shortOrderId = orderId.substring(0, 8).toUpperCase();
            const amount = orderData?.totalAmount?.toLocaleString() || '0';

            // Get currency
            const globalSettingsDoc = await adminDb.collection('settings').doc('global').get();
            const currency = globalSettingsDoc.data()?.currency || '₦';

            const templateData = {
                orderId: shortOrderId,
                customerName,
                amount,
                currency,
                status: newStatus
            };
            
            if (newStatus === 'processing') {
                message = whatsappAlertSettings.orderProcessingTemplate 
                    ? formatWhatsAppMessage(whatsappAlertSettings.orderProcessingTemplate, templateData)
                    : `Hello Admin,\nOrder #${shortOrderId} for ${customerName} is now being processed.`;
            } else if (newStatus === 'shipped') {
                message = whatsappAlertSettings.orderShippedTemplate
                    ? formatWhatsAppMessage(whatsappAlertSettings.orderShippedTemplate, templateData)
                    : `Hello Admin,\nOrder #${shortOrderId} for ${customerName} has been shipped.`;
            } else if (newStatus === 'cancelled') {
                message = whatsappAlertSettings.orderCancelledTemplate
                    ? formatWhatsAppMessage(whatsappAlertSettings.orderCancelledTemplate, templateData)
                    : `Hello Admin,\nOrder #${shortOrderId} for ${customerName} has been cancelled.`;
            } else if (newStatus === 'delivered') {
                message = whatsappAlertSettings.orderDeliveredTemplate
                    ? formatWhatsAppMessage(whatsappAlertSettings.orderDeliveredTemplate, templateData)
                    : `Hello Admin,\nOrder #${shortOrderId} for ${customerName} has been delivered successfully.`;
            }

            if (message && whatsappAlertSettings.senderNumber) {
                sendWhatsAppViaEBulkSMS(
                    whatsappAlertSettings.username,
                    whatsappAlertSettings.apiKey,
                    [whatsappAlertSettings.senderNumber],
                    `Order Status Updated: ${newStatus}`,
                    message,
                    2,
                    whatsappAlertSettings.senderNumber
                ).then(result => {
                    const status = result?.response?.status || result?.status;
                    const statusdetail = result?.response?.statusdetail || result?.statusdetail;
                    
                    logWhatsAppMessage({
                        eventType: 'staff_order_alert',
                        messageContent: message,
                        recipientPhone: whatsappAlertSettings.senderNumber,
                        customerName: customerName,
                        status: status === 'SUCCESS' ? 'sent' : 'failed',
                        unitsCharged: 1,
                        userId: staffId,
                        userName: staffName,
                        storeId: storeId,
                        errorDetails: status !== 'SUCCESS' ? statusdetail : null
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
            updatedAt: FieldValue.serverTimestamp(),
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

function formatWhatsAppMessage(template: string, data: { orderId: string, customerName: string, amount: string, currency: string, status: string, itemsDetails: string }) {
    return template
        .replace(/{orderId}/g, data.orderId)
        .replace(/{customerName}/g, data.customerName)
        .replace(/{amount}/g, data.amount)
        .replace(/{currency}/g, data.currency)
        .replace(/{status}/g, data.status)
        .replace(/{itemsDetails}/g, data.itemsDetails);
}

function formatOrderItemsForWhatsApp(items: any[], currency: string) {
    return items.map(item => `• ${item.productName} x ${item.quantity} - ${currency}${item.price.toLocaleString()}`).join('\n');
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

export async function sendWhatsAppOrderAlert(order: any, settings: WhatsAppAlertSettings, currency: string) {
    const customerName = order.guestInfo?.name || (order.user_id !== 'GUEST' ? await getCustomerName(order.user_id) : 'Customer');
    const amount = order.totalAmount.toLocaleString();
    const orderId = order.id.substring(0, 8).toUpperCase();
    const itemsDetails = formatOrderItemsForWhatsApp(order.items, currency);
    
    // 1. Send to Admin
    if (settings.senderNumber) {
        let adminMessage = '';
        if (settings.orderPlacedTemplate) {
            adminMessage = formatWhatsAppMessage(settings.orderPlacedTemplate, {
                orderId,
                customerName,
                amount,
                currency,
                status: order.status,
                itemsDetails
            });
        } else {
            adminMessage = `Hello Admin,\nYou received a new order.\n\nOrder ID: #${orderId}\nCustomer: ${customerName}\nAmount: ${currency}${amount}\nStatus: ${order.status}\n\nItems:\n${itemsDetails}\n\nLogin to dashboard now.`;
        }

        try {
            const result = await sendWhatsAppViaEBulkSMS(
                settings.username, 
                settings.apiKey, 
                [settings.senderNumber], 
                'New Order Alert (Admin)', 
                adminMessage,
                2,
                settings.senderNumber
            );
            const status = result?.response?.status || result?.status;
            
            await logWhatsAppMessage({
                eventType: 'staff_order_alert',
                messageContent: adminMessage,
                recipientPhone: settings.senderNumber,
                customerName: customerName,
                status: status === 'SUCCESS' ? 'sent' : 'failed',
                unitsCharged: 1,
                userId: 'system',
                userName: 'Order System',
                storeId: order.store_id || 'global',
                errorDetails: status !== 'SUCCESS' ? (result?.response?.statusdetail || result?.statusdetail) : null
            });
        } catch (err) {
            console.error('Error sending admin WhatsApp alert:', err);
        }
    }

    // 2. Send to Customer
    const customerPhone = order.guestInfo?.phone || order.guestInfo?.whatsapp || (order.user_id !== 'GUEST' ? await getCustomerPhone(order.user_id) : null);
    if (customerPhone) {
        let extraMsg = '';
        if (order.paymentMethod === 'Bank Transfer' && order.selectedBankAccount) {
            extraMsg = `\n\n*Payment Instructions:*\nPlease transfer ${currency}${amount} to:\nBank: ${order.selectedBankAccount.bankName}\nAccount: ${order.selectedBankAccount.accountNumber}\nName: ${order.selectedBankAccount.accountName}\nRef: ${order.paymentReference}\n`;
        }

        const customerMessage = `Hello ${customerName},\nYour order #${orderId} at ${order.storeName || 'our store'} has been placed successfully!\n\nOrder Details:\n${itemsDetails}\n\nTotal: ${currency}${amount}\nStatus: ${order.status}${extraMsg}\n\nThank you for shopping with us!`;

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

async function getCustomerName(userId: string) {
    if (!userId || userId === 'GUEST') return 'Customer';
    try {
        const doc = await adminDb.collection('users').doc(userId).get();
        return doc.data()?.displayName || doc.data()?.name || 'Customer';
    } catch (e) {
        return 'Customer';
    }
}
