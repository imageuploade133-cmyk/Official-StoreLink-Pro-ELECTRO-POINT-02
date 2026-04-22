import { adminDb } from './firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import { decrypt } from './encryption';

/**
 * Formats a phone number to Nigerian format (234...)
 * @param phone Phone number to format
 * @returns Formatted phone number as string
 */
export function formatNigerianPhoneNumber(phone: string): string {
    if (!phone) return '';
    let clean = phone.replace(/\D/g, '');
    
    // If it starts with 0 and is 11 digits (Nigerian standard), convert to 234 format
    if (clean.startsWith('0') && clean.length === 11) {
        return '234' + clean.substring(1);
    }
    
    // If it's 10 digits, assume it's missing the leading 0 or country code
    if (clean.length === 10) {
        return '234' + clean;
    }
    
    return clean;
}

/**
 * Logs a WhatsApp message event to Firestore for tracking and analytics
 * @param logData Data about the message sent
 */
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

/**
 * Sends a WhatsApp message via EBulkSMS WhatsApp JSON API.
 * This implementation follows the official EBulkSMS WhatsApp API documentation.
 * 
 * @param username EBulkSMS Username
 * @param apiKey EBulkSMS API Key (handles both plain and encrypted keys)
 * @param recipients Array of recipient phone numbers
 * @param subject Subject or title of the message
 * @param message The actual message content
 * @param retries Number of retries on failure (default: 2)
 * @param _sender Deprecated: Sender ID (not used in current WhatsApp API structure)
 * @returns Normalized API response object
 */
export async function sendWhatsAppViaEBulkSMS(
    username: string, 
    apiKey: string, 
    recipients: string[], 
    subject: string, 
    message: string, 
    retries = 2, 
    _sender?: string
): Promise<any> {
    // Decrypt API Key if it's in the encrypted format (iv:encryptedContent)
    let clearApiKey = apiKey;
    if (apiKey && apiKey.includes(':')) {
        try {
            clearApiKey = decrypt(apiKey);
        } catch (e) {
            console.error('Failed to decrypt API key in sendWhatsAppViaEBulkSMS:', e);
        }
    }

    // Professional JSON payload structure for EBulkSMS WhatsApp API
    const payload = {
        WA: {
            auth: {
                username: username,
                apikey: clearApiKey,
            },
            message: {
                subject: subject,
                messagetext: message,
            },
            recipients: recipients.map(r => formatNigerianPhoneNumber(r)),
        },
    };

    try {
        console.log(`Sending WhatsApp via EBulkSMS to ${recipients.length} recipients...`);
        
        const response = await fetch('https://api.ebulksms.com/sendwhatsapp.json', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify(payload),
        });

        const text = await response.text();
        let data: any;
        
        try {
            data = JSON.parse(text);
        } catch (e) {
            console.warn('EBulkSMS WhatsApp API returned non-JSON response:', text);
            data = { 
                status: 'FAILED', 
                statusdetail: text.substring(0, 150) || 'Invalid response from provider' 
            };
        }
        
        console.log('EBulkSMS API Response:', JSON.stringify(data));
        
        // EBulkSMS can return status in several locations depending on the specific response type
        const responseObj = data?.response || data?.WA || data || {};
        let status = responseObj.status || (response.ok ? 'SUCCESS' : 'FAILED');
        let statusdetail = responseObj.statusdetail || data.message || (response.ok ? 'OK' : `HTTP ${response.status}`);

        // Standardize successful status codes
        const successCodes = ['SUCCESS', 'SUCCESSFUL', '100', 'SENT'];
        const isSuccessful = successCodes.includes(String(status).toUpperCase());

        if (!isSuccessful && retries > 0) {
            console.log(`WhatsApp send failed (${statusdetail}), retrying... (${retries} left)`);
            // Wait a bit before retrying (exponential backoff could be added here)
            return await sendWhatsAppViaEBulkSMS(username, clearApiKey, recipients, subject, message, retries - 1);
        }
        
        // Return a normalized response for the application
        return {
            ...data,
            status: isSuccessful ? 'SUCCESS' : status,
            statusdetail: statusdetail,
            response: {
                ...(data?.response || {}),
                status: isSuccessful ? 'SUCCESS' : status,
                statusdetail: statusdetail,
            }
        };
    } catch (error: any) {
        console.error('Network or Execution error in sendWhatsAppViaEBulkSMS:', error);
        
        if (retries > 0) {
            console.log(`WhatsApp send error, retrying... (${retries} left)`);
            return await sendWhatsAppViaEBulkSMS(username, clearApiKey, recipients, subject, message, retries - 1);
        }
        
        return {
            status: 'FAILED',
            statusdetail: error.message || 'An unexpected error occurred during the API request',
            error: error
        };
    }
}

/**
 * Retrieves WhatsApp settings for a specific store or global settings
 * @param storeId The ID of the store
 * @returns WhatsApp settings object or null
 */
export async function getWhatsAppSettings(storeId: string) {
    let data: any = null;
    let notificationNumbers: string[] = [];
    let enableOrderAlerts = false;
    
    try {
        // 1. Fetch credentials from whatsappAlerts doc
        if (storeId && storeId !== 'global') {
            const doc = await adminDb.collection('stores').doc(storeId).collection('settings').doc('whatsappAlerts').get();
            if (doc.exists) data = doc.data();
        }
        
        if (!data) {
            const globalDoc = await adminDb.collection('settings').doc('whatsappAlerts').get();
            if (globalDoc.exists) data = globalDoc.data();
        }

        // 2. Fetch notification numbers and secondary toggle from config doc
        if (storeId && storeId !== 'global') {
            const configDoc = await adminDb.collection('stores').doc(storeId).collection('settings').doc('config').get();
            if (configDoc.exists) {
                const configData = configDoc.data();
                notificationNumbers = configData?.orderNotificationNumbers || [];
                enableOrderAlerts = configData?.enableOrderAlerts || false;
            } else {
                // Fallback for legacy
                const legacyDoc = await adminDb.collection('settings').doc(storeId).get();
                if (legacyDoc.exists) {
                    const legacyData = legacyDoc.data();
                    notificationNumbers = legacyData?.orderNotificationNumbers || [];
                    enableOrderAlerts = legacyData?.enableOrderAlerts || false;
                }
            }
        } else {
            const globalConfigDoc = await adminDb.collection('settings').doc('global').get();
            if (globalConfigDoc.exists) {
                const globalConfigData = globalConfigDoc.data();
                notificationNumbers = globalConfigData?.orderNotificationNumbers || [];
                enableOrderAlerts = globalConfigData?.enableOrderAlerts || false;
            }
        }

        if (data) {
            // Merge notification numbers
            if (!data.orderNotificationNumbers || data.orderNotificationNumbers.length === 0) {
                data.orderNotificationNumbers = notificationNumbers;
            } else if (notificationNumbers.length > 0) {
                // Combine and remove duplicates
                data.orderNotificationNumbers = Array.from(new Set([...data.orderNotificationNumbers, ...notificationNumbers]));
            }

            // Ensure enabled is true if either toggle is on
            if (enableOrderAlerts) {
                data.enabled = true;
            }
        }
    
        // Automatically decrypt the API key if it's found in the settings
        if (data && data.apiKey) {
            try {
                if (data.apiKey.includes(':')) {
                    data.apiKey = decrypt(data.apiKey);
                }
            } catch (e) {
                console.error('Failed to decrypt WhatsApp API Key in settings:', e);
            }
        }
    } catch (error) {
        console.error('Error fetching WhatsApp settings:', error);
    }
    
    return data;
}
