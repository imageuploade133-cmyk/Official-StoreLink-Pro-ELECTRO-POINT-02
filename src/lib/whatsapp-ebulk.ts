import { adminDb } from './firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import { decrypt } from './encryption';

export function formatNigerianPhoneNumber(phone: string): string {
    let clean = phone.replace(/\D/g, '');
    if (clean.startsWith('0') && clean.length === 11) {
        return '234' + clean.substring(1);
    }
    if (clean.length === 10) {
        return '234' + clean;
    }
    return clean;
}

export async function logWhatsAppMessage(logData: any) {
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

export async function sendWhatsAppViaEBulkSMS(username: string, apiKey: string, recipients: string[], subject: string, message: string, retries = 2, sender?: string) {
    // Decrypt API Key if it's encrypted
    let clearApiKey = apiKey;
    if (apiKey && apiKey.includes(':')) {
        try {
            clearApiKey = decrypt(apiKey);
        } catch (e) {
            console.error('Failed to decrypt API key in sendWhatsAppViaEBulkSMS:', e);
        }
    }

    // EBulkSMS Sender ID for WhatsApp/SMS should be max 11 characters
    // For WhatsApp, it's often the registered phone number, otherwise truncated subject
    const senderId = sender || subject.substring(0, 11);

    const payload = {
        WA: {
            auth: {
                username,
                apikey: clearApiKey,
            },
            message: {
                sender: senderId,
                subject: subject,
                messagetext: message,
            },
            recipients: recipients.map(r => ({
                msisdn: formatNigerianPhoneNumber(r)
            })),
        },
    };

    try {
        // Some versions of the EBulkSMS WhatsApp API use whatsappv1.json
        // We'll try the most common one first.
        const response = await fetch('https://api.ebulksms.com/whatsappv1.json', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });

        const text = await response.text();
        let data: any;
        try {
            data = JSON.parse(text);
        } catch (e) {
            console.log('EBulkSMS Non-JSON Response:', text);
            data = { status: 'FAILED', statusdetail: text.substring(0, 100) || 'Invalid JSON response from provider' };
        }
        console.log('EBulkSMS Response:', JSON.stringify(data));
        
        const status = data?.response?.status || data?.status || data?.WA?.status || ((data?.error || data?.message) ? 'FAILED' : (response.ok ? 'SUCCESS' : 'FAILED'));
        const statusdetail = data?.response?.statusdetail || data?.statusdetail || data?.WA?.statusdetail || data?.error || data?.message || (response.ok ? 'OK' : `HTTP Error ${response.status}`);
        
        if (status !== 'SUCCESS' && status !== 'SUCCESSFUL' && retries > 0) {
            console.log(`WhatsApp send failed (${statusdetail}), retrying... (${retries} left)`);
            return await sendWhatsAppViaEBulkSMS(username, clearApiKey, recipients, subject, message, retries - 1, sender);
        }
        
        // Ensure we return an object with status and statusdetail for the caller
        // and maintain backward compatibility with nested response object
        return {
            ...data,
            status: status,
            statusdetail: statusdetail,
            response: {
                ...(data?.response || {}),
                status: data?.response?.status || status,
                statusdetail: data?.response?.statusdetail || statusdetail,
            }
        };
    } catch (error) {
        console.error('Error in sendWhatsAppViaEBulkSMS:', error);
        if (retries > 0) {
            console.log(`WhatsApp send error, retrying... (${retries} left)`);
            return await sendWhatsAppViaEBulkSMS(username, clearApiKey, recipients, subject, message, retries - 1, sender);
        }
        throw error;
    }
}

export async function getWhatsAppSettings(storeId: string) {
    let data: any = null;
    if (storeId && storeId !== 'global') {
        const doc = await adminDb.collection('stores').doc(storeId).collection('settings').doc('whatsappAlerts').get();
        if (doc.exists) data = doc.data();
    }
    if (!data) {
        const globalDoc = await adminDb.collection('settings').doc('whatsappAlerts').get();
        if (globalDoc.exists) data = globalDoc.data();
    }

    if (data && data.apiKey) {
        try {
            if (data.apiKey.includes(':')) {
                data.apiKey = decrypt(data.apiKey);
            }
        } catch (e) {
            console.error('Failed to decrypt WhatsApp API Key:', e);
        }
    }
    return data;
}
