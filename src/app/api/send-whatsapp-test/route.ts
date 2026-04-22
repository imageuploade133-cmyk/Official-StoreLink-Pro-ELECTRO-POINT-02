import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { getWhatsAppSettings, sendWhatsAppViaEBulkSMS, logWhatsAppMessage } from '@/lib/whatsapp-ebulk';
import { verifyAuthDetailed, checkStoreAuthorization } from '@/lib/auth-admin-utils';

export async function POST(request: Request) {
  try {
    // Authenticate the user
    const { decodedToken, errorCode: authErrorCode } = await verifyAuthDetailed(request);
    if (!decodedToken) {
      return NextResponse.json({ success: false, error: authErrorCode || 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { storeId } = body;

    // Check if user is authorized for this store
    const { authorized, errorCode: storeErrorCode } = await checkStoreAuthorization(decodedToken.uid, storeId || 'global');
    if (!authorized) {
      return NextResponse.json({ success: false, error: storeErrorCode || 'Forbidden' }, { status: 403 });
    }

    // Fetch credentials from Firestore (Secure)
    const settings = await getWhatsAppSettings(storeId || 'global') as any;
    
    if (!settings || !settings.username || !settings.apiKey) {
      return NextResponse.json({ 
        success: false, 
        error: 'WhatsApp credentials are not configured in settings.' 
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
    const recipient = settings.senderNumber;
    
    console.log(`Sending WhatsApp test message for store: ${storeId || 'global'} to ${recipient}`);

    const responseData = await sendWhatsAppViaEBulkSMS(
        settings.username,
        settings.apiKey,
        [recipient],
        "Test Alert",
        message
    );

    // Log provider response in Vercel logs
    console.log('EBulkSMS Response:', JSON.stringify(responseData, null, 2));

    const status = responseData?.response?.status || responseData?.status;
    const statusdetail = responseData?.response?.statusdetail || responseData?.statusdetail;

    if (status === 'SUCCESS') {
        await logWhatsAppMessage({
            eventType: 'custom_message',
            messageContent: message,
            recipientPhone: recipient,
            status: 'sent',
            unitsCharged: 1,
            userId: 'system',
            userName: 'Test System',
            storeId: storeId || 'global',
            apiResponse: JSON.stringify(responseData)
        });
        
        return NextResponse.json({ success: true, details: statusdetail });
    } else {
        return NextResponse.json({ 
            success: false, 
            error: statusdetail || 'Failed to send WhatsApp message via EBulkSMS'
        }, { status: 500 });
    }

  } catch (error: any) {
    console.error('Error in /api/send-whatsapp-test:', error);
    return NextResponse.json({ 
        success: false, 
        error: error.message || 'An unexpected error occurred' 
    }, { status: 500 });
  }
}
