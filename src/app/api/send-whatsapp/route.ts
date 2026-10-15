import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { getWhatsAppSettings, sendWhatsAppViaEBulkSMS } from '@/lib/whatsapp-ebulk';
import { sendWhatsApiText } from '@/lib/whatsapp-whatsapi';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { recipients, message, storeId } = body;

    // Input validation
    if (!Array.isArray(recipients) || recipients.length === 0) {
      return NextResponse.json({ error: 'Recipients must be a non-empty array' }, { status: 400 });
    }
    if (typeof message !== 'string' || message.trim() === '') {
      return NextResponse.json({ error: 'Message must be a non-empty string' }, { status: 400 });
    }

    // Fetch credentials
    let settings = await getWhatsAppSettings(storeId || 'global') as any;
    
    if (!settings || (!settings.username && !settings.whatsApiApiKey)) {
      // Fallback to legacy AppSettings if not found in whatsappAlerts
      const settingsRef = storeId && storeId !== 'global' 
        ? adminDb.collection('stores').doc(storeId).collection('settings').doc('config')
        : adminDb.collection('settings').doc('global');
      
      const settingsSnap = await settingsRef.get();
      const legacyData = settingsSnap.data();
      
      if (!legacyData?.eBulkUsername || !legacyData?.eBulkApiKey) {
        return NextResponse.json({ error: 'WhatsApp credentials are not configured.' }, { status: 500 });
      }

      if (!settings) settings = {};
      settings.provider = 'ebulksms';
      settings.username = legacyData.eBulkUsername;
      settings.apiKey = legacyData.eBulkApiKey;
    }

    const provider = settings.provider || 'ebulksms';
    let responseData: any;

    if (provider === 'whatsapi') {
      if (!settings.whatsApiGatewayUrl || !settings.whatsApiApiKey || !settings.whatsApiInstanceId) {
        return NextResponse.json({ error: 'WhatsAPI Gateway credentials (URL, API Key, or Instance ID) are missing.' }, { status: 400 });
      }

      const sendPromises = recipients.map(rec => sendWhatsApiText({
        gatewayUrl: settings.whatsApiGatewayUrl,
        apiKey: settings.whatsApiApiKey,
        instanceId: settings.whatsApiInstanceId,
        recipient: rec,
        message: message,
      }));

      const results = await Promise.all(sendPromises);
      responseData = results[0];
    } else {
      responseData = await sendWhatsAppViaEBulkSMS(
          settings.username,
          settings.apiKey,
          recipients,
          "POS Notification",
          message,
          2,
          settings.senderNumber
      );
    }

    const status = responseData?.response?.status || responseData?.status;
    const statusdetail = responseData?.response?.statusdetail || responseData?.statusdetail;

    if (status !== 'SUCCESS') {
        return NextResponse.json({ 
            error: 'Failed to send WhatsApp message',
            details: statusdetail || `Unknown API error (Status: ${status || 'Unknown'})`,
            providerResponse: responseData
        }, { status: 500 });
    }
    
    return NextResponse.json(responseData, { status: 200 });

  } catch (error: any) {
    console.error('Error in /api/send-whatsapp:', error);
    let errorMessage = 'An unexpected error occurred';
    if (error.name === 'AbortError') {
      errorMessage = 'The request was aborted.';
    } else if (error instanceof SyntaxError) {
      errorMessage = 'Invalid JSON received from client.';
    }

    return new NextResponse(
      JSON.stringify({ error: errorMessage, details: error.message }),
      { status: 500 }
    );
  }
}
