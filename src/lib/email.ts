import { Resend } from 'resend';
import { adminDb } from './firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';

const globalResend = new Resend(process.env.RESEND_API_KEY);

export async function sendOrderNotifications(order: any, settings: any, storeName: string, emailAlertSettings?: any) {
    const { id: orderId, guestInfo, user_id, totalAmount, paymentStatus, items, deliveryPrice } = order;
    
    const customerEmail = guestInfo?.email || (await getCustomerEmail(user_id));
    const customerName = guestInfo?.name || (await getCustomerName(user_id));
    
    if (!customerEmail) {
        console.error('No customer email found for order', orderId);
    }

    // 1. Prepare items HTML
    let itemsHtml = '';
    for (const item of items) {
        itemsHtml += `
            <tr>
                <td style="padding: 12px; border-bottom: 1px solid #f1f5f9;">${item.productName || 'Product'}</td>
                <td style="padding: 12px; border-bottom: 1px solid #f1f5f9;">${item.quantity}</td>
                <td style="padding: 12px; border-bottom: 1px solid #f1f5f9; text-align: right;">${settings.currency || '$'}${item.price.toFixed(2)}</td>
            </tr>
        `;
    }

    const shippingHtml = (deliveryPrice && deliveryPrice > 0) ? `
        <tr>
            <td colspan="2" style="padding: 10px; text-align: right; color: #64748b;">Shipping</td>
            <td style="padding: 10px; text-align: right;">${settings.currency || '$'}${deliveryPrice.toFixed(2)}</td>
        </tr>
    ` : '';

    const subtotal = (totalAmount - (deliveryPrice || 0)).toFixed(2);

    const commonData = {
        orderId,
        customerName: customerName || 'Valued Customer',
        paymentStatus: paymentStatus || 'UNPAID',
        paymentStatusLower: (paymentStatus || 'UNPAID').toLowerCase(),
        date: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
        itemsHtml,
        subtotal: `${settings.currency || '$'}${subtotal}`,
        shippingHtml,
        total: `${settings.currency || '$'}${totalAmount.toFixed(2)}`,
        deliveryAddress: guestInfo?.address || 'N/A',
        year: new Date().getFullYear(),
        storeName: storeName || 'Our Store',
    };

    const promises = [];

    // Use store-specific Resend if available
    const storeResend = emailAlertSettings?.resendApiKey ? new Resend(emailAlertSettings.resendApiKey) : globalResend;
    const senderEmail = emailAlertSettings?.senderEmail || 'StoreLink Pro <notifications@storelink-pro.com>';

    // Send to customer
    const sendToCustomer = emailAlertSettings ? (emailAlertSettings.enabled && emailAlertSettings.customerConfirmation) : true; 
    if (customerEmail && sendToCustomer) {
        const customerHtml = generateTemplate(commonData, 'confirmation');
        promises.push(sendWithRetry({
            resendInstance: storeResend,
            from: senderEmail,
            to: customerEmail,
            subject: `Order Confirmation - #${orderId} - ${commonData.storeName}`,
            html: customerHtml,
            orderId,
            storeId: settings.id,
            type: 'customer_confirmation'
        }));
    }

    // Send to store owner(s)
    const ownerEmails = emailAlertSettings?.notificationEmail 
        ? [emailAlertSettings.notificationEmail] 
        : (settings.orderNotificationEmails || []);
    
    const enableEmailAlerts = emailAlertSettings ? emailAlertSettings.enabled : settings.enableEmailAlerts;

    if (enableEmailAlerts && ownerEmails.length > 0) {
        const ownerHtml = generateTemplate(commonData, 'notification');
        promises.push(sendWithRetry({
            resendInstance: storeResend,
            from: senderEmail,
            to: ownerEmails,
            subject: `New Order Received - #${orderId} - ${commonData.storeName}`,
            html: ownerHtml,
            orderId,
            storeId: settings.id,
            type: 'owner_notification'
        }));
    }

    await Promise.all(promises);
}

async function sendWithRetry({ resendInstance, from, to, subject, html, orderId, storeId, type }: any) {
    let attempts = 0;
    const maxAttempts = 3;
    let status: 'sent' | 'failed' = 'failed';
    let lastError = '';

    while (attempts < maxAttempts) {
        try {
            const { data, error } = await resendInstance.emails.send({
                from: from,
                to: Array.isArray(to) ? to : [to],
                subject,
                html,
            });
            if (error) throw error;
            status = 'sent';
            break;
        } catch (error: any) {
            attempts++;
            lastError = error.message || 'Unknown error';
            if (attempts < maxAttempts) {
                await new Promise(resolve => setTimeout(resolve, 1000 * attempts));
            }
        }
    }

    // Log to Firestore
    try {
        await adminDb.collection('emailLogs').add({
            storeId: storeId || 'global',
            orderId,
            recipient: Array.isArray(to) ? to.join(', ') : to,
            type,
            status,
            error: lastError || null,
            attempts,
            createdAt: FieldValue.serverTimestamp(),
        });
    } catch (logError) {
        console.error('Failed to log email to Firestore:', logError);
    }
}

function generateTemplate(data: any, type: 'confirmation' | 'notification') {
    const title = type === 'confirmation' ? `Thank you for your order!` : `New Order Received!`;
    const intro = type === 'confirmation' 
        ? `Hi ${data.customerName}, your order at <strong>${data.storeName}</strong> has been received and is being processed.` 
        : `A new order has been placed at <strong>${data.storeName}</strong> by <strong>${data.customerName}</strong>.`;

    const statusColors: Record<string, string> = {
        paid: '#dcfce7',
        unpaid: '#fee2e2',
        pending: '#fef9c3',
        refunded: '#f1f5f9',
    };
    
    const statusTextColors: Record<string, string> = {
        paid: '#166534',
        unpaid: '#991b1b',
        pending: '#854d0e',
        refunded: '#475569',
    };

    const statusColor = statusColors[data.paymentStatusLower] || '#f1f5f9';
    const statusTextColor = statusTextColors[data.paymentStatusLower] || '#475569';

    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
</head>
<body style="font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #1e293b; margin: 0; padding: 0; background-color: #f8fafc;">
    <div style="max-width: 600px; margin: 20px auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);">
        <div style="background-color: #2563eb; padding: 40px 20px; text-align: center;">
            <div style="font-size: 28px; font-weight: 800; color: #ffffff; letter-spacing: -0.025em;">StoreLink Pro</div>
        </div>
        <div style="padding: 40px 30px;">
            <h2 style="margin-top: 0; color: #0f172a; font-size: 24px; font-weight: 700;">${title}</h2>
            <p style="color: #475569; font-size: 16px;">${intro}</p>
            
            <div style="background-color: #f1f5f9; padding: 25px; border-radius: 16px; margin: 30px 0; border: 1px solid #e2e8f0;">
                <table style="width: 100%; border-collapse: collapse;">
                    <tr>
                        <td style="padding: 4px 0; color: #64748b; font-size: 14px;">Order ID</td>
                        <td style="padding: 4px 0; text-align: right; font-weight: 600;">#${data.orderId}</td>
                    </tr>
                    <tr>
                        <td style="padding: 4px 0; color: #64748b; font-size: 14px;">Date</td>
                        <td style="padding: 4px 0; text-align: right; font-weight: 600;">${data.date}</td>
                    </tr>
                    <tr>
                        <td style="padding: 4px 0; color: #64748b; font-size: 14px;">Payment Status</td>
                        <td style="padding: 4px 0; text-align: right;">
                            <span style="display: inline-block; padding: 4px 12px; border-radius: 9999px; font-weight: 700; text-transform: uppercase; font-size: 11px; background-color: ${statusColor}; color: ${statusTextColor};">
                                ${data.paymentStatus}
                            </span>
                        </td>
                    </tr>
                </table>
            </div>
            
            <h3 style="color: #0f172a; font-size: 18px; font-weight: 600; margin-bottom: 16px;">Order Items</h3>
            <table style="width: 100%; border-collapse: collapse;">
                <thead>
                    <tr>
                        <th style="text-align: left; padding: 12px; border-bottom: 2px solid #e2e8f0; color: #64748b; font-size: 12px; text-transform: uppercase; letter-spacing: 0.05em;">Item</th>
                        <th style="text-align: left; padding: 12px; border-bottom: 2px solid #e2e8f0; color: #64748b; font-size: 12px; text-transform: uppercase; letter-spacing: 0.05em;">Qty</th>
                        <th style="text-align: right; padding: 12px; border-bottom: 2px solid #e2e8f0; color: #64748b; font-size: 12px; text-transform: uppercase; letter-spacing: 0.05em;">Price</th>
                    </tr>
                </thead>
                <tbody>
                    ${data.itemsHtml}
                </tbody>
                <tfoot>
                    <tr>
                        <td colspan="2" style="padding: 20px 10px 5px; text-align: right; color: #64748b; font-size: 14px;">Subtotal</td>
                        <td style="padding: 20px 10px 5px; text-align: right; font-weight: 600;">${data.subtotal}</td>
                    </tr>
                    ${data.shippingHtml}
                    <tr>
                        <td colspan="2" style="padding: 10px; text-align: right; color: #0f172a; font-size: 18px; font-weight: 700;">Total</td>
                        <td style="padding: 10px; text-align: right; color: #2563eb; font-size: 20px; font-weight: 800;">${data.total}</td>
                    </tr>
                </tfoot>
            </table>
            
            <h3 style="color: #0f172a; font-size: 18px; font-weight: 600; margin: 40px 0 16px;">Delivery Details</h3>
            <div style="background-color: #f8fafc; padding: 20px; border-radius: 12px; border: 1px solid #e2e8f0; border-left: 4px solid #2563eb;">
                <p style="margin: 0; color: #475569; font-size: 15px; white-space: pre-line;">${data.deliveryAddress}</p>
            </div>
        </div>
        <div style="background-color: #f1f5f9; padding: 30px; text-align: center;">
            <p style="margin: 0; color: #94a3b8; font-size: 12px; font-weight: 500;">
                &copy; ${data.year} StoreLink Pro. Empowering businesses with smart E-Commerce & POS solutions.
            </p>
        </div>
    </div>
</body>
</html>
    `;
}

async function getCustomerEmail(userId: string) {
    if (!userId || userId === 'GUEST') return null;
    try {
        const doc = await adminDb.collection('users').doc(userId).get();
        return doc.data()?.email || null;
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
