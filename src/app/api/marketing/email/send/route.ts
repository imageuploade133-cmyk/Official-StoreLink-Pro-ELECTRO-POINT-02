import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { Timestamp, FieldValue } from 'firebase-admin/firestore';
import { decrypt } from '@/lib/encryption';
import { verifyAuthDetailed, checkStoreAuthorization } from '@/lib/auth-admin-utils';
import { sendViaProvider } from '@/lib/email';

export async function POST(request: Request) {
  try {
    const { decodedToken, errorCode: authErrorCode } = await verifyAuthDetailed(request);
    if (!decodedToken) {
      return NextResponse.json({ error: authErrorCode }, { status: 401 });
    }

    const body = await request.json();
    const { targetTab, subject, content, recipientEmails, recipients: rawRecipients, storeId } = body;

    if (!storeId) {
      return NextResponse.json({ error: 'Store ID is required' }, { status: 400 });
    }

    if (!subject || !content) {
      return NextResponse.json({ error: 'Subject and email content are required' }, { status: 400 });
    }

    const { authorized, errorCode: storeErrorCode, errorMessage } = await checkStoreAuthorization(decodedToken.uid, storeId);
    if (!authorized) {
      return NextResponse.json(
        { error: errorMessage || storeErrorCode },
        { status: storeErrorCode === 'missing_credentials' ? 500 : 403 }
      );
    }

    // 1. Fetch Email Notification Provider Settings
    let notifRef = storeId === 'global'
      ? adminDb.collection('settings').doc('notifications')
      : adminDb.collection('stores').doc(storeId).collection('settings').doc('notifications');

    let notifSnap = await notifRef.get();
    if (!notifSnap.exists && storeId !== 'global') {
      notifSnap = await adminDb.collection('settings').doc('notifications').get();
    }

    if (!notifSnap.exists) {
      return NextResponse.json({ error: 'No email provider configured. Please configure your email provider in Settings > Order Alerts.' }, { status: 400 });
    }

    const notifData = notifSnap.data();
    if (!notifData?.enabled) {
      return NextResponse.json({ error: 'Email provider is disabled. Please enable it in Settings.' }, { status: 400 });
    }

    const provider = notifData.provider || 'email_gateway';
    const apiKey = notifData.apiKeyEncrypted ? decrypt(notifData.apiKeyEncrypted) : '';
    const senderName = notifData.senderName || 'Store Marketing';
    const senderEmail = notifData.senderEmail || 'noreply@storelink.pro';
    const apiBaseUrl = notifData.apiBaseUrl || 'https://whatsapp-b5os.onrender.com';

    if (!apiKey) {
      return NextResponse.json({ error: 'API Key is missing in email provider settings.' }, { status: 400 });
    }

    // 2. Fetch Store Info
    let storeName = 'Our Store';
    if (storeId && storeId !== 'global') {
      const storeDoc = await adminDb.collection('stores').doc(storeId).get();
      if (storeDoc.exists) {
        storeName = storeDoc.data()?.name || storeName;
      }
    }

    // 3. Resolve Target Recipients List
    let recipients: { name: string; email: string }[] = [];

    if (Array.isArray(rawRecipients) && rawRecipients.length > 0) {
      recipients = rawRecipients.map((r: any) => ({
        name: r.name || r.email.split('@')[0],
        email: typeof r === 'string' ? r : r.email
      }));
    } else if (Array.isArray(recipientEmails) && recipientEmails.length > 0) {
      recipients = recipientEmails.map((e: string) => ({
        name: e.split('@')[0],
        email: e
      }));
    } else if (targetTab === 'staff') {
      const staffQuery = storeId === 'global'
        ? adminDb.collection('staff')
        : adminDb.collection('staff').where('store_id', '==', storeId);
      const staffSnap = await staffQuery.get();
      staffSnap.forEach((doc) => {
        const d = doc.data();
        if (d.email) {
          recipients.push({ name: d.name || 'Staff Member', email: d.email });
        }
      });
    } else if (targetTab === 'custom') {
      const customQuery = storeId === 'global'
        ? adminDb.collection('customEmailRecipients')
        : adminDb.collection('customEmailRecipients').where('storeId', '==', storeId);
      const customSnap = await customQuery.get();
      customSnap.forEach((doc) => {
        const d = doc.data();
        if (d.email) {
          recipients.push({ name: d.name || d.email.split('@')[0], email: d.email });
        }
      });
    } else {
      // Default: customers
      const custQuery = storeId === 'global'
        ? adminDb.collection('customers')
        : adminDb.collection('customers').where('store_id', '==', storeId);
      const custSnap = await custQuery.get();
      custSnap.forEach((doc) => {
        const d = doc.data();
        if (d.email) {
          recipients.push({ name: d.name || 'Valued Customer', email: d.email });
        }
      });
    }

    if (recipients.length === 0) {
      return NextResponse.json({ error: 'No recipients found for this selection.' }, { status: 400 });
    }

    const fromHeader = `"${senderName}" <${senderEmail}>`;
    let successCount = 0;
    let failureCount = 0;
    const errors: string[] = [];

    // Dispatch Emails with dynamic placeholder replacement
    for (const recipient of recipients) {
      const personalizedHtml = content
        .replace(/\{name\}/gi, recipient.name)
        .replace(/\{email\}/gi, recipient.email)
        .replace(/\{storeName\}/gi, storeName);

      const personalizedSubject = subject
        .replace(/\{name\}/gi, recipient.name)
        .replace(/\{email\}/gi, recipient.email)
        .replace(/\{storeName\}/gi, storeName);

      const result = await sendViaProvider(provider, apiKey, fromHeader, recipient.email, personalizedSubject, personalizedHtml, {
        storeId,
        apiBaseUrl,
        type: `marketing_${targetTab || 'campaign'}`
      });

      if (result.success) {
        successCount++;
      } else {
        failureCount++;
        if (result.error && !errors.includes(result.error)) {
          errors.push(result.error);
        }
      }
    }

    // Log Campaign in Firestore
    await adminDb.collection('emailCampaignLogs').add({
      storeId,
      targetTab: targetTab || 'custom',
      subject,
      totalRecipients: recipients.length,
      successCount,
      failureCount,
      errors,
      sentBy: decodedToken.email || decodedToken.uid,
      createdAt: FieldValue.serverTimestamp(),
    });

    return NextResponse.json({
      success: true,
      totalSent: successCount,
      totalFailed: failureCount,
      recipientCount: recipients.length,
      errors
    });

  } catch (error: any) {
    console.error('Error in email marketing dispatch route:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
