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

export async function sendWhatsAppViaEBulkSMS(username: string, apiKey: string, recipients: string[], subject: string, message: string, retries = 2) {
    // Decrypt API Key if it's encrypted
    let clearApiKey = apiKey;
    if (apiKey && apiKey.includes(':')) {
        try {
            clearApiKey = decrypt(apiKey);
        } catch (e) {
            console.error('Failed to decrypt API key in sendWhatsAppViaEBulkSMS:', e);
        }
    }

    const payload = {
        WA: {
            auth: {
                username,
                apikey: clearApiKey,
            },
            message: {
                subject,
                messagetext: message,
            },
            recipients: recipients.map(r => ({
                msisdn: formatNigerianPhoneNumber(r)
            })),
        },
    };

    try {
        const response = await fetch('https://api.ebulksms.com/sendwhatsapp.json', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });

        const data = await response.json();
        const status = data?.response?.status || data?.status;
        const statusdetail = data?.response?.statusdetail || data?.statusdetail;
        
        if (status !== 'SUCCESS' && retries > 0) {
            console.log(`WhatsApp send failed (${statusdetail}), retrying... (${retries} left)`);
            return await sendWhatsAppViaEBulkSMS(username, clearApiKey, recipients, subject, message, retries - 1);
        }
        
        return data;
    } catch (error) {
        if (retries > 0) {
            console.log(`WhatsApp send error, retrying... (${retries} left)`);
            return await sendWhatsAppViaEBulkSMS(username, clearApiKey, recipients, subject, message, retries - 1);
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
