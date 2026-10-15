import nodemailer from 'nodemailer';
import { adminDb } from './firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import { decrypt } from './encryption';

export async function sendOrderNotifications(order: any, settings: any, storeName: string, emailAlertSettings?: any) {
    const { id: orderId, guestInfo, user_id, totalAmount, paymentStatus, items, deliveryPrice, paymentMethod, fulfillmentType } = order;
    
    // Fetch new notification settings if not provided
    let notificationSettings = null;
    const storeId = settings.id || order.store_id;
    if (storeId && storeId !== 'global') {
        const notifDoc = await adminDb.collection('stores').doc(storeId).collection('settings').doc('notifications').get();
        if (notifDoc.exists) {
            notificationSettings = notifDoc.data();
        }
    }

    if (!notificationSettings || !notificationSettings.enabled) {
        const globalNotifDoc = await adminDb.collection('settings').doc('notifications').get();
        if (globalNotifDoc.exists) {
            notificationSettings = globalNotifDoc.data();
        }
    }

    const customerEmail = guestInfo?.email || (await getCustomerEmail(user_id));
    const customerName = guestInfo?.name || (await getCustomerName(user_id));
    const customerPhone = guestInfo?.phone || (await getCustomerPhone(user_id));
    
    if (!customerEmail) {
        console.error('No customer email found for order', orderId);
    }

    // 1. Prepare items HTML
    let itemsHtml = '';
    for (const item of items) {
        const options = item.selectedOptions ? Object.entries(item.selectedOptions).map(([k, v]) => `${k}: ${v}`).join(', ') : '';
        itemsHtml += `
            <tr>
                <td style="padding: 12px; border-bottom: 1px solid #f1f5f9; font-weight: bold;">
                    <div>${item.productName || 'Product'}</div>
                    ${options ? `<div style="font-size: 11px; color: #64748b; font-weight: normal; margin-top: 4px;">${options}</div>` : ''}
                </td>
                <td style="padding: 12px; border-bottom: 1px solid #f1f5f9; font-weight: bold;">${item.quantity}</td>
                <td style="padding: 12px; border-bottom: 1px solid #f1f5f9; text-align: right; font-weight: bold;">${settings.currency || '$'}${item.price.toFixed(2)}</td>
            </tr>
        `;
    }

    const shippingHtml = (deliveryPrice && deliveryPrice > 0) ? `
        <tr>
            <td colspan="2" style="padding: 10px; text-align: right; color: #0f172a; font-weight: bold;">Delivery Fee</td>
            <td style="padding: 10px; text-align: right; font-weight: bold;">${settings.currency || '$'}${deliveryPrice.toFixed(2)}</td>
        </tr>
    ` : '';

    const subtotal = (totalAmount - (deliveryPrice || 0)).toFixed(2);

    const deliveryDetails = [
        `Name: ${customerName}`,
        `Email: ${customerEmail || 'N/A'}`,
        `Phone: ${customerPhone || 'N/A'}`,
        fulfillmentType === 'pickup' ? `Method: Store Pickup` : `Address: ${guestInfo?.address || 'N/A'}`
    ].join('\n');

    const commonData = {
        orderId,
        customerName: customerName || 'Valued Customer',
        paymentStatus: paymentStatus || 'UNPAID',
        paymentMethod: paymentMethod || 'N/A',
        paymentStatusLower: (paymentStatus || 'UNPAID').toLowerCase(),
        date: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
        itemsHtml,
        productFee: `${settings.currency || '$'}${subtotal}`,
        shippingHtml,
        total: `${settings.currency || '$'}${totalAmount.toFixed(2)}`,
        deliveryAddress: deliveryDetails,
        year: new Date().getFullYear(),
        storeName: storeName || 'Our Store',
    };

    const promises = [];

    // Prioritize new notification settings
    if (notificationSettings && notificationSettings.enabled && notificationSettings.provider) {
        const { provider, apiKeyEncrypted, senderName, senderEmail, apiBaseUrl } = notificationSettings;
        const apiKey = apiKeyEncrypted ? decrypt(apiKeyEncrypted) : '';

        if (apiKey) {
            const subjectCustomer = `Order Confirmation - #${orderId} - ${commonData.storeName}`;
            const subjectOwner = `New Order Received - #${orderId} - ${commonData.storeName}`;
            const htmlCustomer = generateTemplate(commonData, 'confirmation');
            const htmlOwner = generateTemplate(commonData, 'notification');

            const from = `"${senderName || storeName}" <${senderEmail}>`;

            if (customerEmail) {
                promises.push(sendViaProvider(provider, apiKey, from, customerEmail, subjectCustomer, htmlCustomer, {
                    orderId,
                    storeId,
                    apiBaseUrl,
                    type: 'customer_confirmation'
                }));
            }

            // Also send to owner if possible
            if (senderEmail) {
                promises.push(sendViaProvider(provider, apiKey, from, senderEmail, subjectOwner, htmlOwner, {
                    orderId,
                    storeId,
                    apiBaseUrl,
                    type: 'owner_notification'
                }));
            }
        }
    } else {
        // Fallback to Gmail SMTP if available
        const useGmail = emailAlertSettings && emailAlertSettings.provider === 'gmail' && emailAlertSettings.gmailEmail && emailAlertSettings.gmailAppPassword;
        
        if (useGmail) {
            const transporter = nodemailer.createTransport({
                host: 'smtp.gmail.com',
                port: 465,
                secure: true,
                auth: {
                    user: emailAlertSettings.gmailEmail,
                    pass: emailAlertSettings.gmailAppPassword,
                },
            });

            const senderName = emailAlertSettings.senderName || storeName || 'StoreLink Pro';
            const from = `"${senderName}" <${emailAlertSettings.gmailEmail}>`;

            // Send to customer
            const sendToCustomer = emailAlertSettings.enabled && emailAlertSettings.customerConfirmation; 
            if (customerEmail && sendToCustomer) {
                const customerHtml = generateTemplate(commonData, 'confirmation');
                promises.push(sendWithRetry({
                    transporter,
                    from,
                    to: customerEmail,
                    subject: `Order Confirmation - #${orderId} - ${commonData.storeName}`,
                    html: customerHtml,
                    orderId,
                    storeId,
                    type: 'customer_confirmation'
                }));
            }

            // Send to store owner(s)
            const ownerEmails = emailAlertSettings.notificationEmail 
                ? [emailAlertSettings.notificationEmail] 
                : [];
            
            const enableEmailAlerts = emailAlertSettings.enabled;

            if (enableEmailAlerts && ownerEmails.length > 0) {
                const ownerHtml = generateTemplate(commonData, 'notification');
                promises.push(sendWithRetry({
                    transporter,
                    from,
                    to: ownerEmails,
                    subject: `New Order Received - #${orderId} - ${commonData.storeName}`,
                    html: ownerHtml,
                    orderId,
                    storeId,
                    type: 'owner_notification'
                }));
            }
        } else {
            console.log('No email provider configured for store', storeId);
            // Optional: Platform fallback here if required
        }
    }

    await Promise.all(promises);
}

export async function sendViaProvider(provider: string, apiKey: string, from: string, to: string, subject: string, html: string, meta: any): Promise<{success: boolean; error?: string}> {
    let success = false;
    let error = '';

    try {
        // Trim API key if it's not a JSON config (SMTP)
        const cleanApiKey = provider === 'smtp' ? apiKey.trim() : apiKey.trim();
        
        if (provider === 'brevo') {
            const response = await fetch('https://api.brevo.com/v3/smtp/email', {
                method: 'POST',
                headers: {
                    'accept': 'application/json',
                    'api-key': cleanApiKey,
                    'content-type': 'application/json'
                },
                body: JSON.stringify({
                    sender: parseFrom(from),
                    to: [{ email: to }],
                    subject: subject,
                    htmlContent: html
                })
            });

            if (!response.ok) {
                const result = await response.json().catch(() => ({ message: `Error ${response.status}: ${response.statusText}` }));
                throw new Error(result.message || result.error || 'Brevo API error');
            }
            success = true;
        } else if (provider === 'resend') {
            const response = await fetch('https://api.resend.com/emails', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${cleanApiKey}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    from: from,
                    to: [to],
                    subject: subject,
                    html: html
                })
            });

            if (!response.ok) {
                const result = await response.json().catch(() => ({ message: `Error ${response.status}: ${response.statusText}` }));
                throw new Error(result.message || result.error?.message || 'Resend API error');
            }
            success = true;
        } else if (provider === 'smtp') {
            // apiKey for SMTP should be a JSON string with host, port, user, pass
            let config;
            try {
                config = JSON.parse(cleanApiKey);
            } catch (e) {
                throw new Error('Invalid SMTP config JSON. Please check the format.');
            }

            const transporter = nodemailer.createTransport({
                host: config.host?.trim(),
                port: parseInt(String(config.port)),
                secure: String(config.port) === '465' || !!config.secure,
                auth: {
                    user: config.user?.trim(),
                    pass: config.pass?.trim(),
                },
                // Add a timeout
                connectTimeout: 10000,
            });

            await transporter.verify(); // Verify connection before sending
            await transporter.sendMail({ from, to, subject, html });
            success = true;
        } else if (provider === 'email_gateway') {
            const baseUrl = (meta?.apiBaseUrl || 'https://whatsapp-b5os.onrender.com').replace(/\/$/, '');
            const response = await fetch(`${baseUrl}/api/email/send`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-api-key': cleanApiKey
                },
                body: JSON.stringify({
                    to: to,
                    subject: subject,
                    html: html
                })
            });

            if (!response.ok) {
                const result = await response.json().catch(() => ({ message: `Error ${response.status}: ${response.statusText}` }));
                throw new Error(result.message || result.error || 'Email Gateway API error');
            }
            success = true;
        } else {
            throw new Error(`Unsupported email provider: ${provider}`);
        }
    } catch (e: any) {
        error = e.message;
        console.error(`Error sending email via ${provider}:`, e);
    }

    // Log to Firestore
    try {
        await adminDb.collection('emailLogs').add({
            storeId: meta.storeId || 'global',
            orderId: meta.orderId || 'N/A',
            recipient: to,
            type: meta.type,
            status: success ? 'sent' : 'failed',
            error: error || null,
            provider,
            createdAt: FieldValue.serverTimestamp(),
        });
    } catch (logError) {
        console.error('Failed to log email to Firestore:', logError);
    }

    return { success, error };
}

function parseFrom(from: string) {
    const match = from.match(/"?([^"]*)"?\s*<([^>]*)>/);
    if (match) {
        return { name: match[1], email: match[2] };
    }
    return { name: 'Store', email: from };
}

async function sendWithRetry({ transporter, from, to, subject, html, orderId, storeId, type }: any) {
    let attempts = 0;
    const maxAttempts = 3;
    let status: 'sent' | 'failed' = 'failed';
    let lastError = '';

    while (attempts < maxAttempts) {
        try {
            await transporter.sendMail({
                from,
                to: Array.isArray(to) ? to.join(', ') : to,
                subject,
                html,
            });
            status = 'sent';
            break;
        } catch (error: any) {
            attempts++;
            lastError = error.message || 'Unknown error';
            console.error(`Email attempt ${attempts} failed:`, lastError);
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

export async function sendEmailViaGateway(apiKey: string, to: string, subject: string, html: string, baseUrl = 'https://whatsapp-b5os.onrender.com') {
    const cleanUrl = baseUrl.replace(/\/$/, '');
    const response = await fetch(`${cleanUrl}/api/email/send`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-api-key': apiKey.trim()
        },
        body: JSON.stringify({ to, subject, html })
    });
    if (!response.ok) {
        const err = await response.json().catch(() => ({ message: `Error ${response.status}: ${response.statusText}` }));
        throw new Error(err.message || err.error || 'Failed to send email via Email Gateway');
    }
    return await response.json().catch(() => ({ success: true }));
}

export async function sendEmailTemplateViaGateway(apiKey: string, to: string, template: string, data: Record<string, any>, baseUrl = 'https://whatsapp-b5os.onrender.com') {
    const cleanUrl = baseUrl.replace(/\/$/, '');
    const response = await fetch(`${cleanUrl}/api/email/send-template`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-api-key': apiKey.trim()
        },
        body: JSON.stringify({ to, template, data })
    });
    if (!response.ok) {
        const err = await response.json().catch(() => ({ message: `Error ${response.status}: ${response.statusText}` }));
        throw new Error(err.message || err.error || 'Failed to send email template via Email Gateway');
    }
    return await response.json().catch(() => ({ success: true }));
}

export async function sendEmailOtpViaGateway(apiKey: string, email: string, name: string, baseUrl = 'https://whatsapp-b5os.onrender.com') {
    const cleanUrl = baseUrl.replace(/\/$/, '');
    const response = await fetch(`${cleanUrl}/api/email/otp`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-api-key': apiKey.trim()
        },
        body: JSON.stringify({ email, name })
    });
    if (!response.ok) {
        const err = await response.json().catch(() => ({ message: `Error ${response.status}: ${response.statusText}` }));
        throw new Error(err.message || err.error || 'Failed to send OTP email via Email Gateway');
    }
    return await response.json().catch(() => ({ success: true }));
}

export function generateTemplate(data: any, type: 'confirmation' | 'notification') {
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
<body style="font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #1e293b; margin: 0; padding: 0; background-color: #f8fafc; font-weight: bold;">
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
                        <td style="padding: 4px 0; color: #64748b; font-size: 14px; font-weight: bold;">Order ID</td>
                        <td style="padding: 4px 0; text-align: right; font-weight: bold;">#${data.orderId}</td>
                    </tr>
                    <tr>
                        <td style="padding: 4px 0; color: #64748b; font-size: 14px; font-weight: bold;">Date</td>
                        <td style="padding: 4px 0; text-align: right; font-weight: bold;">${data.date}</td>
                    </tr>
                    <tr>
                        <td style="padding: 4px 0; color: #64748b; font-size: 14px; font-weight: bold;">Payment Method</td>
                        <td style="padding: 4px 0; text-align: right; font-weight: bold;">${data.paymentMethod}</td>
                    </tr>
                    <tr>
                        <td style="padding: 4px 0; color: #64748b; font-size: 14px; font-weight: bold;">Payment Status</td>
                        <td style="padding: 4px 0; text-align: right;">
                            <span style="display: inline-block; padding: 4px 12px; border-radius: 9999px; font-weight: 800; text-transform: uppercase; font-size: 11px; background-color: ${statusColor}; color: ${statusTextColor};">
                                ${data.paymentStatus}
                            </span>
                        </td>
                    </tr>
                </table>
            </div>
            
            <h3 style="color: #0f172a; font-size: 18px; font-weight: 800; margin-bottom: 16px;">Order Items</h3>
            <table style="width: 100%; border-collapse: collapse;">
                <thead>
                    <tr>
                        <th style="text-align: left; padding: 12px; border-bottom: 2px solid #e2e8f0; color: #0f172a; font-size: 12px; text-transform: uppercase; letter-spacing: 0.05em; font-weight: bold;">Item</th>
                        <th style="text-align: left; padding: 12px; border-bottom: 2px solid #e2e8f0; color: #0f172a; font-size: 12px; text-transform: uppercase; letter-spacing: 0.05em; font-weight: bold;">Qty</th>
                        <th style="text-align: right; padding: 12px; border-bottom: 2px solid #e2e8f0; color: #0f172a; font-size: 12px; text-transform: uppercase; letter-spacing: 0.05em; font-weight: bold;">Price</th>
                    </tr>
                </thead>
                <tbody>
                    ${data.itemsHtml}
                </tbody>
                <tfoot>
                    <tr>
                        <td colspan="2" style="padding: 20px 10px 5px; text-align: right; color: #0f172a; font-size: 14px; font-weight: bold;">Product Fee</td>
                        <td style="padding: 20px 10px 5px; text-align: right; font-weight: 800;">${data.productFee}</td>
                    </tr>
                    ${data.shippingHtml}
                    <tr>
                        <td colspan="2" style="padding: 10px; text-align: right; color: #0f172a; font-size: 18px; font-weight: 800;">Total</td>
                        <td style="padding: 10px; text-align: right; color: #2563eb; font-size: 20px; font-weight: 800;">${data.total}</td>
                    </tr>
                </tfoot>
            </table>
            
            <h3 style="color: #0f172a; font-size: 18px; font-weight: 800; margin: 40px 0 16px;">Delivery Details</h3>
            <div style="background-color: #f8fafc; padding: 20px; border-radius: 12px; border: 1px solid #e2e8f0; border-left: 4px solid #2563eb;">
                <p style="margin: 0; color: #0f172a; font-size: 15px; white-space: pre-line; font-weight: bold;">${data.deliveryAddress}</p>
            </div>
        </div>
        <div style="background-color: #f1f5f9; padding: 30px; text-align: center;">
            <p style="margin: 0; color: #94a3b8; font-size: 12px; font-weight: bold;">
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
