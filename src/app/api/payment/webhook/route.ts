import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { Timestamp } from 'firebase-admin/firestore';
import { decrypt } from '@/lib/encryption';
import * as crypto from 'crypto';
import { Transaction } from '@/lib/types';
import { 
  getWhatsAppSettings, 
  sendWhatsAppViaEBulkSMS, 
  logWhatsAppMessage 
} from '@/lib/whatsapp-ebulk';
import { sendWhatsAppOrderAlert } from '../../actions/orders';

export async function POST(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const providerName = searchParams.get('provider');
    const storeId = searchParams.get('storeId') || 'global';
    
    const body = await request.text();

    const providerId = `${storeId}_${providerName}`;
    let secretKey = '';
    
    try {
      const providerSnap = await adminDb.collection('payment_providers').doc(providerId).get();
      
      if (providerSnap.exists) {
        const providerData = providerSnap.data();
        const config = JSON.parse(decrypt(providerData?.config));
        const mode = providerData?.mode || 'test';
        secretKey = mode === 'live' ? config.liveSecretKey : config.testSecretKey || config.secretKey;
      }
    } catch (dbError) {
      console.error('Database error fetching provider config:', dbError);
    }

    // Fallback to environment variables if DB failed or provider not found
    if (!secretKey) {
      if (providerName === 'paystack') {
        secretKey = process.env.PAYSTACK_SECRET_KEY || '';
      } else if (providerName === 'flutterwave') {
        secretKey = process.env.FLUTTERWAVE_SECRET_KEY || '';
      }
    }

    if (!secretKey) {
      console.error(`No secret key found for provider ${providerName}`);
      return NextResponse.json({ error: 'Provider configuration not found' }, { status: 404 });
    }

    if (providerName === 'paystack') {
      const hash = crypto.createHmac('sha512', secretKey).update(body).digest('hex');
      if (hash !== request.headers.get('x-paystack-signature')) {
        return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
      }

      const event = JSON.parse(body);
      if (event.event === 'charge.success') {
        const reference = event.data.reference;
        const metadata = event.data.metadata;
        await processSuccessfulTransaction(reference, metadata);
      }
    } else if (providerName === 'flutterwave') {
        const event = JSON.parse(body);
        if (event['event.type'] === 'CARD_TRANSACTION' && event.status === 'successful') {
            const reference = event.tx_ref;
            const metadata = event.customer; // Flutterwave metadata structure varies
            await processSuccessfulTransaction(reference, metadata);
        }
    } else if (providerName === 'opay') {
        const event = JSON.parse(body);
        if (event.status === 'SUCCESS' || event.data?.status === 'SUCCESSFUL') {
            const reference = event.reference || event.data?.reference;
            await processSuccessfulTransaction(reference, event.data);
        }
    } else if (providerName === 'nowpayments') {
        const event = JSON.parse(body);
        if (event.payment_status === 'finished' || event.payment_status === 'partially_paid') {
            const orderId = event.order_id;
            const transactionsSnap = await adminDb.collection('transactions')
                .where('orderId', '==', orderId)
                .where('provider', '==', 'nowpayments')
                .limit(1)
                .get();
            
            if (!transactionsSnap.empty) {
                const reference = transactionsSnap.docs[0].id;
                await processSuccessfulTransaction(reference, event);
            }
        }
    } else if (providerName === 'monnify') {
        const signature = request.headers.get('monnify-signature') || request.headers.get('x-monnify-signature');
        const hash = crypto.createHmac('sha512', secretKey).update(body).digest('hex');
        if (hash !== signature) {
            console.error('Invalid Monnify signature');
            return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
        }

        const event = JSON.parse(body);
        // Monnify status for success is PAID
        if (event.paymentStatus === 'PAID') {
            const reference = event.paymentReference;
            await processSuccessfulTransaction(reference, event);
        }
    } else if (providerName === 'palmpay') {
        const event = JSON.parse(body);
        if (event.status === 'SUCCESS' || event.code === '0') {
            const reference = event.reference || event.data?.reference;
            await processSuccessfulTransaction(reference, event.data);
        }
    } else if (providerName === 'adyen') {
        const event = JSON.parse(body);
        // Adyen sends an array of notificationItems
        if (event.notificationItems && event.notificationItems.length > 0) {
            for (const item of event.notificationItems) {
                const notification = item.notificationRequestItem;
                // Check eventCode and success
                if (notification.eventCode === 'AUTHORISATION' && notification.success === 'true') {
                    const reference = notification.merchantReference;
                    await processSuccessfulTransaction(reference, notification);
                }
            }
        }
    }

    return NextResponse.json({ received: true });
  } catch (error: any) {
    console.error('Webhook error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

async function processSuccessfulTransaction(reference: string, metadata?: any) {
  const transactionRef = adminDb.collection('transactions').doc(reference);

  try {
    await adminDb.runTransaction(async (dbTransaction) => {
      const transactionSnap = await dbTransaction.get(transactionRef);
      let transactionData: Transaction | null = null;
      let orderId = '';

      if (transactionSnap.exists) {
        transactionData = transactionSnap.data() as Transaction;
        orderId = transactionData.orderId;
      } else if (metadata && metadata.orderId) {
        orderId = metadata.orderId;
        const newTransaction: any = {
          id: reference,
          storeId: metadata.storeId || 'global',
          orderId: orderId,
          provider: 'paystack', 
          reference,
          amount: metadata.amount || 0,
          status: 'success',
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
        };
        dbTransaction.set(transactionRef, newTransaction);
      }

      if (orderId) {
        if (!transactionData || transactionData.status !== 'success') {
          if (transactionSnap.exists) {
            dbTransaction.update(transactionRef, {
              status: 'success',
              updatedAt: Timestamp.now(),
            });
          }

          const orderRef = adminDb.collection('orders').doc(orderId);
          dbTransaction.update(orderRef, {
            status: 'processing',
            paymentStatus: 'PAID',
            isPaid: true,
            updatedAt: Timestamp.now(),
          });

          // Trigger WhatsApp notification for payment confirmed
          getWhatsAppSettings(transactionData?.storeId || metadata?.storeId || 'global').then(async (settings) => {
            if (settings && settings.enabled) {
              const orderSnap = await orderRef.get();
              const orderData = orderSnap.data();
              if (orderData) {
                const globalSettingsDoc = await adminDb.collection('settings').doc('global').get();
                const currency = globalSettingsDoc.data()?.currency || '₦';
                
                // This sends full order details to both Admin and Customer
                await sendWhatsAppOrderAlert({ 
                  id: orderId, 
                  ...orderData, 
                  status: 'processing', 
                  paymentStatus: 'PAID' 
                }, settings, currency);
              }
            }
          }).catch(err => console.error('Error sending WhatsApp payment alert:', err));
        }
      }
    });
  } catch (dbError) {
    console.error('Failed to process successful transaction in DB:', dbError);
  }
}
