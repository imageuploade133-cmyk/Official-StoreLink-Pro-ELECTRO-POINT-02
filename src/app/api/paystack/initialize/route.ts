import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { Timestamp } from 'firebase-admin/firestore';
import { Transaction } from '@/lib/types';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, amount, orderId, metadata = {} } = body;

    if (!email || !amount) {
      return NextResponse.json({ error: 'Missing required fields: email and amount' }, { status: 400 });
    }

    const secretKey = process.env.PAYSTACK_SECRET_KEY;
    if (!secretKey) {
      return NextResponse.json({ error: 'Paystack secret key not configured' }, { status: 500 });
    }

    const reference = `PAY-${Date.now()}-${Math.floor(Math.random() * 1000000)}`;

    const response = await fetch('https://api.paystack.co/transaction/initialize', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${secretKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email,
        amount: Math.round(Number(amount) * 100), // Convert to kobo
        reference,
        metadata: {
          ...metadata,
          orderId,
        },
      }),
    });

    const result = await response.json();

    if (!result.status) {
      return NextResponse.json({ error: result.message }, { status: 400 });
    }

    // Save transaction to database as pending
    if (orderId) {
        const transactionData: Partial<Transaction> = {
            id: reference,
            storeId: 'global',
            orderId,
            provider: 'paystack',
            reference,
            amount: Number(amount),
            currency: 'NGN',
            status: 'pending',
            customerEmail: email,
            createdAt: Timestamp.now() as any,
            updatedAt: Timestamp.now() as any,
        };
        try {
            await adminDb.collection('transactions').doc(reference).set(transactionData);
        } catch (dbError) {
            console.error('Failed to save transaction to database:', dbError);
            // We continue even if DB save fails, as Paystack has the metadata to recover
        }
    }

    return NextResponse.json({
      success: true,
      authorization_url: result.data.authorization_url,
      reference,
    });
  } catch (error: any) {
    console.error('Paystack initialization error:', error);
    const message = error.message || 'Unknown error';
    if (message.includes('Could not load the default credentials')) {
        return NextResponse.json({ error: 'Missing Google Cloud credentials. Please ensure FIREBASE_SERVICE_ACCOUNT_KEY is set.' }, { status: 500 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
