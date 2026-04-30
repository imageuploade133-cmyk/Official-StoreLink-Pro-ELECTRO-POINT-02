import { NextResponse } from 'next/server';
import { decrypt } from '@/lib/encryption';
import { verifyAuthDetailed, checkStoreAuthorization } from '@/lib/auth-admin-utils';
import { sendViaProvider, generateTemplate } from '@/lib/email';
import { adminDb } from '@/lib/firebase-admin';

export async function POST(request: Request) {
  try {
    const { decodedToken, errorCode: authErrorCode } = await verifyAuthDetailed(request);
    if (!decodedToken) {
      return NextResponse.json({ error: authErrorCode }, { status: 401 });
    }

    const body = await request.json();
    const { provider, apiKey, senderName, senderEmail, testEmail, storeId } = body;

    if (!storeId) {
      return NextResponse.json({ error: 'Store ID is required' }, { status: 400 });
    }

    const { authorized, errorCode: storeErrorCode, errorMessage } = await checkStoreAuthorization(decodedToken.uid, storeId);
    if (!authorized) {
      return NextResponse.json(
        { error: errorMessage || storeErrorCode }, 
        { status: storeErrorCode === 'missing_credentials' ? 500 : 403 }
      );
    }

    // Decrypt API key if it's already stored (masked)
    let finalApiKey = apiKey;
    if (apiKey && apiKey.includes('****')) {
        const notifRef = storeId === 'global'
            ? adminDb.collection('settings').doc('notifications')
            : adminDb.collection('stores').doc(storeId).collection('settings').doc('notifications');
            
        const notifDoc = await notifRef.get();
        if (notifDoc.exists) {
            const data = notifDoc.data();
            if (data?.apiKeyEncrypted) {
                finalApiKey = decrypt(data.apiKeyEncrypted);
            }
        }
    }

    if (!finalApiKey) {
        return NextResponse.json({ error: 'API Key is required' }, { status: 400 });
    }

    if (finalApiKey.includes('****')) {
        return NextResponse.json({ error: 'Please re-enter your API key to test. The stored key could not be retrieved.' }, { status: 400 });
    }

    const dummyData = {
        orderId: 'TEST-12345',
        customerName: 'Test Recipient',
        paymentStatus: 'PAID',
        paymentMethod: 'Test Payment',
        paymentStatusLower: 'paid',
        date: new Date().toLocaleDateString(),
        itemsHtml: '<tr><td style="padding: 12px; border-bottom: 1px solid #f1f5f9; font-weight: bold;">Sample Product</td><td style="padding: 12px; border-bottom: 1px solid #f1f5f9; font-weight: bold;">1</td><td style="padding: 12px; border-bottom: 1px solid #f1f5f9; text-align: right; font-weight: bold;">$100.00</td></tr>',
        productFee: '$100.00',
        shippingHtml: '',
        total: '$100.00',
        deliveryAddress: '123 Test Street, Test City',
        year: new Date().getFullYear(),
        storeName: senderName || 'Test Store',
    };

    const html = generateTemplate(dummyData, 'confirmation');
    const from = `"${senderName || 'Test Store'}" <${senderEmail}>`;
    const subject = `Test Email from ${senderName || 'V9 POS System'}`;

    const { success, error: providerError } = await sendViaProvider(provider, finalApiKey, from, testEmail, subject, html, {
        storeId,
        type: 'test_email'
    });

    if (success) {
        return NextResponse.json({ success: true });
    } else {
        return NextResponse.json({ 
            error: providerError || 'Failed to send test email. Check your provider settings and API key.' 
        }, { status: 500 });
    }
  } catch (error: any) {
    console.error('Error sending test email:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
