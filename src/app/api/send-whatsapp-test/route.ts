import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { getWhatsAppSettings, sendWhatsAppViaEBulkSMS, logWhatsAppMessage } from '@/lib/whatsapp-ebulk';
import { verifyAuthDetailed, checkStoreAuthorization } from '@/lib/auth-admin-utils';

export async function POST(request: Request) {
  console.log('WhatsApp test request received');
  try {
    // Authenticate the user
    const { decodedToken, errorCode: authErrorCode } = await verifyAuthDetailed(request);
    if (!decodedToken) {
      console.log('Authentication failed:', authErrorCode);
      return NextResponse.json({ success: false, error: authErrorCode || 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    console.log('Request payload:', JSON.stringify(body));
    const { storeId } = body;
    console.log(`Current user/store id: ${decodedToken.uid} / ${storeId || 'global'}`);

    // Check if user is authorized for this store
    const { authorized, errorCode: storeErrorCode, errorMessage } = await checkStoreAuthorization(decodedToken.uid, storeId || 'global');
    if (!authorized) {
      console.log('Authorization failed:', errorMessage || storeErrorCode);
      return NextResponse.json(
        { success: false, error: errorMessage || storeErrorCode || 'Forbidden' }, 
        { status: storeErrorCode === 'missing_credentials' ? 500 : 403 }
      );
    }

    // Fetch credentials from Firestore (Secure)
    const settings = await getWhatsAppSettings(storeId || 'global') as any;
    
    if (!settings) {
      console.log('Firestore settings missing');
      return NextResponse.json({ 
        success: false, 
        error: "Settings not found" 
      }, { status: 404 });
    }
    console.log('Firestore settings loaded');

    const apiKeyExists = !!(settings.apiKey && settings.username);
    console.log(`API key exists: ${apiKeyExists}`);

    if (!apiKeyExists) {
      return NextResponse.json({ 
        success: false, 
        error: "Missing API key" 
      }, { status: 400 });
    }

    if (!settings.senderNumber) {
        return NextResponse.json({ 
            success: false, 
            error: 'Sender WhatsApp number is not configured.' 
        }, { status: 400 });
    }

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
    
    const message = `Test Message from ${storeName}.\n\nYour WhatsApp Alert system is now fully functional!`;
    
    // Collect all recipients
    const recipients: string[] = [];
    if (settings.senderNumber) recipients.push(settings.senderNumber);
    if (settings.orderNotificationNumbers && Array.isArray(settings.orderNotificationNumbers)) {
        settings.orderNotificationNumbers.forEach((num: string) => {
            if (num && !recipients.includes(num)) {
                recipients.push(num);
            }
        });
    }

    if (recipients.length === 0) {
        return NextResponse.json({ 
            success: false, 
            error: 'No recipient WhatsApp numbers configured. Please add numbers in Order Alerts or WhatsApp Settings.' 
        }, { status: 400 });
    }
    
    console.log(`Sending WhatsApp test message for store: ${storeId || 'global'} to ${recipients.length} recipients: ${recipients.join(', ')}`);

    const responseData = await sendWhatsAppViaEBulkSMS(
        settings.username,
        settings.apiKey,
        recipients,
        "Test Alert",
        message,
        2,
        settings.senderNumber
    );

    const status = responseData?.response?.status || responseData?.status;
    const statusdetail = responseData?.response?.statusdetail || responseData?.statusdetail;

    console.log('Provider response status:', status);
    console.log('Provider response body:', JSON.stringify(responseData));

    if (status === 'SUCCESS') {
        // Log for each recipient
        for (const recipient of recipients) {
            await logWhatsAppMessage({
                eventType: 'custom_message',
                messageContent: message,
                recipientPhone: recipient,
                status: 'sent',
                unitsCharged: 1,
                userId: decodedToken.uid,
                userName: decodedToken.name || 'Admin',
                storeId: storeId || 'global',
                apiResponse: JSON.stringify(responseData)
            });
        }
        
        return NextResponse.json({ success: true, details: statusdetail, recipientCount: recipients.length });
    } else {
        console.log('WhatsApp send failed with status:', status, 'and detail:', statusdetail);
        // If provider rejects: return exact provider response
        return NextResponse.json({ 
            success: false, 
            error: statusdetail || `Failed to send WhatsApp message via EBulkSMS (Status: ${status || 'Unknown'})`,
            providerResponse: responseData
        }, { status: 400 });
    }

  } catch (error: any) {
    console.error('Error in /api/send-whatsapp-test:', error);
    // Never return generic 500 without details
    return NextResponse.json({ 
        success: false, 
        error: error.message || 'An unexpected error occurred' 
    }, { status: 500 });
  }
}
